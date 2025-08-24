import subprocess
import random
import sys

def discrep(npts, seed, do_precompute):
  args = ['./discrep', '-r' + str(npts), '-s' + str(seed), '-v']
  if do_precompute:
    args.append('-p')
  try:
    O = subprocess.check_output(args)
  except:
    print npts, seed
    sys.exit(1)
  lastline = O.split('\n')[-2]
  ans = lastline.replace('Scap','')
  return eval(ans)

def discreps(npts, ntimes):
  seed = random.randint(0, 1<<31)
  ans = []
  for i in xrange(ntimes):
    if i % 10 == 0:
      print "\rIters: ", i,
      sys.stdout.flush()
    seed = random.randint(0, 1<<31)
    ans.append( discrep(npts, seed, True) )
  print ""
  return ans
