"""Candidate stressed contact graphs for critical configurations of N = 5 points on S^2.

A critical configuration of rho (Lecture 11) carries weights w >= 0, not all 0, balancing the
forces on the contact graph.  Let S be the support of w (the stressed subgraph).  We list the graphs
on 5 vertices (isolated vertices = points carrying no force) and remove those excluded by:
  R1  S is planar                              (contact graphs are planar: crossing lemma)
  R2  every non-isolated vertex has degree >= 2 (one force cannot balance)
  R3  no vertex of degree 2 lies in a triangle  (degree 2 => straight => theta = 2pi/3, impossible for N >= 4)
  R4  two vertices with >= 3 common neighbours are antipodal and theta = pi/2; so they are not
      adjacent, and their common neighbours (on the equator between them) span no triangle
"""
import networkx as nx

def rules(g):
    sup = [v for v in g if g.degree(v) > 0]
    if not sup: return 'empty'
    if not nx.check_planarity(g)[0]: return 'R1'
    if any(g.degree(v) == 1 for v in sup): return 'R2'
    for v in sup:
        if g.degree(v) == 2:
            a, b = list(g[v])
            if g.has_edge(a, b): return 'R3'
    for a in g:
        for b in g:
            common = set(g[a]) & set(g[b])
            if a < b and len(common) >= 3:
                if g.has_edge(a, b): return 'R4'          # antipodal points are at distance pi, not theta
                if any(g.has_edge(c, e) and g.has_edge(c, f) and g.has_edge(e, f)
                       for c in common for e in common for f in common if c < e < f):
                    return 'R4'                           # 3 points of a great circle pairwise pi/2 apart
    return 'survives'

if __name__ == '__main__':
    G5 = [g for g in nx.graph_atlas_g() if g.number_of_nodes() == 5]
    from collections import Counter
    res = [(rules(g), g) for g in G5]
    print(len(G5), Counter(r for r, _ in res))
    for r, g in res:
        if r == 'survives':
            print(sorted((d for _, d in g.degree()), reverse=True), sorted(g.edges()))
