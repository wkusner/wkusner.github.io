"""Certified branch and bound for Thue's triangle lemma (Lecture 1, Lemma L1:lem:triangle-density).

Claim.  Let x=a^2, y=b^2, z=c^2 be the squared sides of a triangle with all sides >= 2 and
circumradius <= 2, and let c be the longest side.  Then 16*Area^2 = H(x,y,z) >= 48,
i.e. Area >= sqrt(3).

Reduction (done by hand, checked symbolically below):
    H - 48 = P/z + lam*g,   lam = (z-4)/(4z) >= 0,   g = 4H - xyz >= 0  (circumradius <= 2),
    P = A z^2 + B z + C,    A = (xy-16)/4,  B = 16-(x-8)(y-8),  C = -4(x-y)^2.
So it suffices to prove P >= 0 on the region 4 <= x <= z, 4 <= y <= z, z <= 16.
This script proves that by branch and bound on boxes, using exact rational interval arithmetic
(fractions.Fraction: no floating point anywhere) and interval enclosures of the gradient
(forward-mode automatic differentiation, i.e. dual numbers whose entries are intervals).
"""
from fractions import Fraction as Fr

class I:                                   # closed interval [lo, hi] with rational endpoints
    def __init__(s, lo, hi=None): s.lo, s.hi = Fr(lo), Fr(lo if hi is None else hi)
    def __add__(s, t): t = t if isinstance(t, I) else I(t); return I(s.lo + t.lo, s.hi + t.hi)
    __radd__ = __add__
    def __neg__(s): return I(-s.hi, -s.lo)
    def __sub__(s, t): return s + (-(t if isinstance(t, I) else I(t)))
    def __rsub__(s, t): return I(t) - s
    def __mul__(s, t):
        t = t if isinstance(t, I) else I(t)
        p = [s.lo*t.lo, s.lo*t.hi, s.hi*t.lo, s.hi*t.hi]; return I(min(p), max(p))
    __rmul__ = __mul__
    def sq(s):                             # tighter than s*s: a square is >= 0
        lo, hi = sorted([abs(s.lo), abs(s.hi)])
        return I(0 if s.lo <= 0 <= s.hi else lo*lo, hi*hi)

class D:                                   # dual number: value and gradient, all intervals
    def __init__(s, v, g): s.v, s.g = v, g
    def __add__(s, t):
        t = t if isinstance(t, D) else D(I(t), [I(0)]*3)
        return D(s.v + t.v, [a + b for a, b in zip(s.g, t.g)])
    __radd__ = __add__
    def __neg__(s): return D(-s.v, [-a for a in s.g])
    def __sub__(s, t): return s + (-(t if isinstance(t, D) else D(I(t), [I(0)]*3)))
    def __rsub__(s, t): return (-s) + t
    def __mul__(s, t):
        if not isinstance(t, D): return D(s.v*t, [a*t for a in s.g])
        return D(s.v*t.v, [s.v*b + t.v*a for a, b in zip(s.g, t.g)])   # Leibniz rule
    __rmul__ = __mul__
    def sq(s): return s*s

def P(x, y, z):
    A = Fr(1, 4)*(x*y - 16); B = 16 - (x - 8)*(y - 8); C = -4*(x - y).sq()
    return A*z.sq() + B*z + C

def grad(X, Y, Z):                         # interval enclosure of the gradient of P on the box
    e = lambda k: [I(1) if j == k else I(0) for j in range(3)]
    return P(D(X, e(0)), D(Y, e(1)), D(Z, e(2))).g

def check(X, Y, Z, stats):
    """Return True if P >= 0 is proved on the part of the box lying in the region."""
    if Z.hi < X.lo or Z.hi < Y.lo:          # box misses the region z >= x, z >= y
        stats['outside'] += 1; return True
    if P(X, Y, Z).lo >= 0:                  # plain interval bound
        stats['value'] += 1; return True
    gx, gy, _ = grad(X, Y, Z)               # monotone in x (resp. y): move to the lower face
    if gx.lo >= 0 and gy.lo >= 0:
        Xf, Yf = I(X.lo), I(Y.lo)
        if P(Xf, Yf, Z).lo >= 0:            # includes the tight edge x = y = 4, where P = 0
            stats['monotone'] += 1; return True
    return False

def bb(box, stats, depth=0, leaves=None):
    stats['boxes'] += 1
    if check(*box, stats):
        if leaves is not None: leaves.append((box, depth))
        return
    k = max(range(3), key=lambda j: box[j].hi - box[j].lo)          # split the widest side
    m = (box[k].lo + box[k].hi) / 2
    for half in (I(box[k].lo, m), I(m, box[k].hi)):
        b = list(box); b[k] = half; bb(tuple(b), stats, depth + 1, leaves)

if __name__ == '__main__':
    import sympy as sp                      # only to double-check the hand reduction
    x, y, z = sp.symbols('x y z')
    H = 2*x*y + 2*y*z + 2*z*x - x**2 - y**2 - z**2
    Ps = (x*y - 16)/4*z**2 + (16 - (x - 8)*(y - 8))*z - 4*(x - y)**2
    assert sp.expand(z*(H - 48) - (Ps + (z - 4)/4*(4*H - x*y*z))) == 0
    stats = dict(boxes=0, outside=0, value=0, monotone=0); leaves = []
    bb((I(4, 16), I(4, 16), I(4, 16)), stats, leaves=leaves)
    print(stats, 'max depth', max(d for _, d in leaves))
