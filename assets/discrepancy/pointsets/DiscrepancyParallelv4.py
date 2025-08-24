__author__ = 'bozo'
# Woden Kusner: spherical cap discrepancy 2014-2015 TU Graz


##can run the +- error of <= vs = at the same time inside the loops... right now I run these loops individually

## can to put the set x in shared mem, rigit now it prob uses 4 copies of the point set
## optimize mem usage vs CPU useage with matrix multiplication...? may not be worth it
## can move to cluster or gpu processing.   python might be too weak for the full implementation. 
## multithreading is NOT enabled for this, do I have hyperthreading? need to check...
################################################################################
################################################################################
################################################################################

import numpy as np
from joblib import Parallel, delayed
import multiprocessing

################################################################################
################################################################################
################################################################################

maxcores = multiprocessing.cpu_count()

q1 = raw_input("random or from .csv?(r/c):")
put = 1
while put == 1:
    if q1 == "r":
        N = int(raw_input("integer number of random points (default 42):") or 42)
        seed = int(raw_input("integer random seed (default 342343423):") or 342343423)

        def points(N):
            np.random.seed(seed)
            dim = 3
            norm = np.random.normal
            norm_dev = norm(size=(dim, N))
            rad = np.sqrt((norm_dev ** 2).sum(axis=0))
            return np.transpose(norm_dev / rad)

        Z = points(N)
        put = 0

    elif q1 == "c":
        file = str(raw_input("csv file:"))
        import csv

        f = open(file)
        csv_f = csv.reader(f)

        points12 = []
        for row in csv_f:
            points12.append(row)

        Z = np.array(points12).astype('float')
        put = 0

    else:
		q1 = "r"
        #q1 = raw_input("random or .csv? (r/c):")

cores = int(raw_input("Cores to run. Choose 1 for non-parallel, 2 to %d(default) for parallel:" % maxcores) or maxcores) 

################################################################################
################################################################################
################################################################################

def NMSQ(u):
    return np.dot(u, u)
# norm squared of u

def NM(u):
    return np.sqrt(np.dot(u, u))
# norm of u

def CRS(u, v):
    return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - v[0] * u[1]]
# cross product of u and v

def VNMal(u, v, w):
    return CRS(u - w, v - w) / NM(CRS(u - w, v - w))
# the center of a three point cap

def LNMal(u, v):
        return (u + v) / NM(u + v)
# the center of a two point cap

def len(u):
    return np.size(u, 0)
# length of a string of points

################################################################################
################################################################################
################################################################################


def FULLDISCREPANCYLOOP(u):
    hold = 0
    for i in range(0, len(u) - 2):
        for j in range(i + 1, len(u) - 1):
            if NM(u[i] + u[j]) == 0:
                hold=hold
            else:
                y1 = LNMal(u[i], u[j])
                z1 = 0
                y2 = LNMal(u[i], u[j])
                z2 = 0

                for l in range(0, len(u)):
                    if np.dot(y1, u[i]) < np.dot(y1, u[l]):
                        z1 = z1 + 1
                    else:
                        z1 = z1

                    if np.dot(y2, u[i]) <= np.dot(y2, u[l]):
                        z2 = z2 + 1
                    else:
                        z2 = z2

                y1d = float(z1) / (len(u))
                y1s = (1 - np.dot(LNMal(u[i], u[j]), u[i])) / 2
                if np.absolute(y1d - y1s) > hold:
                    hold = np.absolute(y1d - y1s)
                else:
                    hold = hold

                y2d = float(z2) / (len(u))
                y2s = (1 - np.dot(LNMal(u[i], u[j]), u[i])) / 2
                if np.absolute(y2d - y2s) > hold:
                    hold = np.absolute(y2d - y2s)
                else:
                    hold = hold

                for k in range(j + 1, len(u)):
                    y3 = VNMal(u[i], u[j], u[k])
                    z3 = 0
                    for l in range(0, len(u)):
                        if np.dot(y3, u[i]) < np.dot(y3, u[l]):
                            z3 = z3 + 1
                        else:
                            z3 = z3
                    y3d = float(z3) / (len(u))
                    y3s = (1 - np.dot(VNMal(u[i], u[j], u[k]), u[i])) / 2
                    if np.absolute(y3d - y3s) > hold:
                        hold = np.absolute(y3d - y3s)
                    else:
                     hold = hold

                    y4 = VNMal(u[i], u[j], u[k])
                    z4 = 0
                    for l in range(0, len(u)):
                        if np.dot(y4, u[i]) <= np.dot(y4, u[l]):
                            z4 = z4 + 1
                        else:
                            z4 = z4
                    y4d = float(z4) /(len(u))
                    y4s = (1 - np.dot(VNMal(u[i], u[j], u[k]), u[i])) / 2
                    if np.absolute(y4d - y4s) > hold:
                        hold = np.absolute(y4d - y4s)
                    else:
                        hold = hold
    return hold




################################################################################
################################################################################
################################################################################

def FULLDISCREPANCYITERATOR(i):
    hold = 0
    u = Z
    for j in range(i + 1, len(u) - 1):

        y1 = LNMal(u[i], u[j])
        z1 = 0
        y2 = LNMal(u[i], u[j])
        z2 = 0

        for l in range(0, len(u)):
            if np.dot(y1, u[i]) < np.dot(y1, u[l]):
                z1 = z1 + 1
            else:
                z1 = z1

            if np.dot(y2, u[i]) <= np.dot(y2, u[l]):
                z2 = z2 + 1
            else:
                z2 = z2

        y1d = z1 // (len(u) )
        if NM(u[i] + u[j]) == 0:
            y1s = 0.5
        else:
            y1s = (1 - np.dot(LNMal(u[i], u[j]), u[i])) / 2
        if np.absolute(y1d - y1s) > hold:
            hold = np.absolute(y1d - y1s)
        else:
            hold = hold

        y2d = float(z2) / (len(u))
        if NM(u[i] + u[j]) == 0:
            y2s = 0.5
        else:
            y2s = (1 - np.dot(LNMal(u[i], u[j]), u[i])) / 2
        if np.absolute(y2d - y2s) > hold:
            hold = np.absolute(y2d - y2s)
        else:
            hold = hold

        for k in range(j + 1, len(u)):
            y3 = VNMal(u[i], u[j], u[k])
            z3 = 0
            for l in range(0, len(u)):
                if np.dot(y3, u[i]) < np.dot(y3, u[l]):
                    z3 = z3 + 1
                else:
                    z3 = z3
            y3d = float(z3) / (len(u))
            y3s = (1 - np.dot(VNMal(u[i], u[j], u[k]), u[i])) / 2
            if np.absolute(y3d - y3s) > hold:
                hold = np.absolute(y3d - y3s)
            else:
                hold = hold

            y4 = VNMal(u[i], u[j], u[k])
            z4 = 0
            for l in range(0, len(u)):
                if np.dot(y4, u[i]) <= np.dot(y4, u[l]):
                    z4 = z4 + 1
                else:
                    z4 = z4
            y4d = float(z4) / (len(u))
            y4s = (1 - np.dot(VNMal(u[i], u[j], u[k]), u[i])) / 2
            if np.absolute(y4d - y4s) > hold:
                hold = np.absolute(y4d - y4s)
            else:
                hold = hold
    return hold


def PARALLELDISCREPANCY(u):
    return Parallel(n_jobs=2)(delayed(FULLDISCREPANCYITERATOR)(i) for i in range(len(u) - 2))

################################################################################
################################################################################
################################################################################    

#print np.max(PARALLELDISCREPANCY(Z))

#print Z



def FULLDISCREPANCYIT(i):
    hold = 0
    u = Z
    for j in range(i + 1, len(u) - 1):
        if NM(u[i] + u[j]) == 0:
            hold=hold
        else:
            y1 = LNMal(u[i], u[j])
            z1 = 0
            y2 = LNMal(u[i], u[j])
            z2 = 0

            for l in range(0, len(u)):
                if np.dot(y1, u[i]) < np.dot(y1, u[l]):
                    z1 = z1 + 1
                else:
                    z1 = z1

                if np.dot(y2, u[i]) <= np.dot(y2, u[l]):
                    z2 = z2 + 1
                else:
                    z2 = z2

            y1d = float(z1) / (len(u))
            y1s = (1 - np.dot(LNMal(u[i], u[j]), u[i])) / 2
            if np.absolute(y1d - y1s) > hold:
                hold = np.absolute(y1d - y1s)
            else:
                hold = hold

            y2d = float(z2) / (len(u))
            y2s = (1 - np.dot(LNMal(u[i], u[j]), u[i])) / 2
            if np.absolute(y2d - y2s) > hold:
                hold = np.absolute(y2d - y2s)
            else:
                hold = hold

            for k in range(j + 1, len(u)):
                y3 = VNMal(u[i], u[j], u[k])
                z3 = 0
                for l in range(0, len(u)):
                    if np.dot(y3, u[i]) < np.dot(y3, u[l]):
                        z3 = z3 + 1
                    else:
                        z3 = z3
                y3d = float(z3) / (len(u))
                y3s = (1 - np.dot(VNMal(u[i], u[j], u[k]), u[i])) / 2
                if np.absolute(y3d - y3s) > hold:
                    hold = np.absolute(y3d - y3s)
                else:
                    hold = hold

                y4 = VNMal(u[i], u[j], u[k])
                z4 = 0
                for l in range(0, len(u)):
                    if np.dot(y4, u[i]) <= np.dot(y4, u[l]):
                        z4 = z4 + 1
                    else:
                        z4 = z4
                y4d = float(z4) / (len(u))
                y4s = (1 - np.dot(VNMal(u[i], u[j], u[k]), u[i])) / 2
                if np.absolute(y4d - y4s) > hold:
                    hold = np.absolute(y4d - y4s)
                else:
                    hold = hold
    return hold

def PARALLEL(u):
	return np.max(Parallel(n_jobs=cores)(delayed(FULLDISCREPANCYIT)(i) for i in range(len(u) - 2)))





def SD(u):
	global cores
	print ("Discrepancy of your choice of %s points:") % len(u)
	print ("Running on %d cores.") % cores
	if cores==1:
		print FULLDISCREPANCYLOOP(u)
	elif 1<cores <= maxcores:
		print PARALLEL(u)
	else:
		print "Not enough cores!"
		cores = maxcores
		print ("Running on %d cores.") % cores
		print PARALLEL(u)
		

SD(Z)
		