"""Meet in the middle: count vectors of E8 by norm, splitting coordinates 4+4.

E8 = D8 u (D8 + h), h = (1/2,...,1/2), D8 = {x in Z^8 : sum x even}.  Work with 2x to stay
integral.  A vector of E8 of norm n is (u,v) with u,v in the same coset class; we tabulate the
halves u in (2Z)^4 or (2Z+1)^4 by (norm, sum mod 4) and match the classes of u and v.
"""
from itertools import product
from collections import Counter

def halves(M, odd):
    """4-tuples w (w = 2u) with all entries even (odd=False) or all odd, |w|^2 <= 4M."""
    r = [k for k in range(-2*M, 2*M+1) if k % 2 == (1 if odd else 0) and k*k <= 4*M]
    T = Counter()
    for w in product(r, repeat=4):
        n = sum(k*k for k in w)
        if n <= 4*M: T[(n, sum(w) % 4)] += 1
    return T

def count(M):
    """number of E8 vectors of norm 2m, m = 1..M (norm of x = |2x|^2/4)."""
    out = Counter(); work = 0
    for odd in (False, True):
        T = halves(2*M, odd); work += sum(T.values())
        for (n1, s1), c1 in T.items():
            for (n2, s2), c2 in T.items():
                if (s1 + s2) % 4 == 0 and (n1 + n2) % 8 == 0 and 0 < n1 + n2 <= 8*M:
                    out[(n1 + n2)//8] += c1*c2      # |2x|^2 = 4*norm = 8m
    return [out[m] for m in range(1, M+1)], work

if __name__ == '__main__':
    counts, work = count(4)
    print('norms 2,4,6,8:', counts, ' half-vectors listed:', work)
    sigma3 = lambda m: sum(d**3 for d in range(1, m+1) if m % d == 0)
    print('240*sigma_3(m):', [240*sigma3(m) for m in range(1, 5)])
