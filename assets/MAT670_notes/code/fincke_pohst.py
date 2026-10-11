"""Fincke-Pohst enumeration of short vectors, run on the E8 lattice given by its Cartan matrix.

List all x in Z^n with x^T G x <= C.  Complete squares (Cholesky/LDL^T with exact rationals):
    Q(x) = sum_i q_ii (x_i + sum_{j>i} q_ij x_j)^2,
then choose x_n, x_{n-1}, ..., x_1 in turn; at each level the remaining budget gives an interval
for the next coordinate (a branch and bound over integer points).
"""
from fractions import Fraction as Fr
from math import isqrt, floor, ceil

def ldl(G):
    n = len(G); q = [[Fr(G[i][j]) for j in range(n)] for i in range(n)]
    for i in range(n):                       # q[i][i] = d_i, q[i][j] (j>i) = l_ji
        for j in range(i+1, n):
            q[j][i] = q[i][j]; q[i][j] = q[i][j] / q[i][i]
        for k in range(i+1, n):
            for l in range(k, n):
                q[k][l] -= q[k][i] * q[i][l]
    return q

def short_vectors(G, C):
    n = len(G); q = ldl(G); out = []; nodes = [0]
    def rec(i, x, budget):                   # coordinates i+1..n-1 already chosen
        nodes[0] += 1
        if i < 0: out.append(tuple(x)); return
        c = -sum(q[i][j] * x[j] for j in range(i+1, n))       # centre for x_i
        r2 = budget / q[i][i]                                  # (x_i - c)^2 <= r2
        w = isqrt(int(r2) + 1) + 1                            # integer range containing |x_i - c| <= sqrt(r2)
        for xi in range(floor(c) - w, ceil(c) + w + 1):
            t = (xi - c) ** 2
            if t <= r2:
                x[i] = xi; rec(i - 1, x, budget - q[i][i] * t)
        x[i] = 0
    rec(n - 1, [0] * n, Fr(C))
    return out, nodes[0]

E8 = [[2,-1,0,0,0,0,0,0],[-1,2,-1,0,0,0,0,0],[0,-1,2,-1,0,0,0,-1],[0,0,-1,2,-1,0,0,0],
      [0,0,0,-1,2,-1,0,0],[0,0,0,0,-1,2,-1,0],[0,0,0,0,0,-1,2,0],[0,0,-1,0,0,0,0,2]]
if __name__ == '__main__':
    for C in (2, 4):
        v, nodes = short_vectors(E8, C)
        print('norm <=', C, ':', len(v) - 1, 'nonzero vectors;', nodes, 'nodes in the search tree')
