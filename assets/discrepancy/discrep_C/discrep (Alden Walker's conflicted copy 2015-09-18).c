/* discrep.c
 *
 * Given a list of points on the unit sphere, iterate over all pairs
 * and triples of points.  For each pair and triple, compute the circle defined
 * by them, and find the discrepancy of that spherical cap (and its antipode)
 */
 
//Compile with: gcc -o discrep -std=c99 -O3 discrep.c
//Or: gcc -o discrep -std=c99 -Wall -g discrep.c

#include <stdlib.h>
#include <stdio.h>
#include <math.h>

#define PI 3.14159265358979
#define UNIT_AREA 12.5663706143592

/****************************************************************************
 * A vector of 3 floats type
 ****************************************************************************/
typedef struct { 
  float v[3];
} point3d_t;

//-- Print to stdout 
void point3d_print(const point3d_t* p) {
  printf("[%f, %f, %f]", p->v[0], p->v[1], p->v[2]);
}

//-- Return the dot product of a and b 
float point3d_dot(const point3d_t* a, const point3d_t* b) {
  return a->v[0]*b->v[0] + a->v[1]*b->v[1] + a->v[2]*b->v[2];
}

//-- make x be a+b
void point3d_add(point3d_t* x, const point3d_t* a, const point3d_t* b) {
  x->v[0] = a->v[0] + b->v[0];
  x->v[1] = a->v[1] + b->v[1];
  x->v[2] = a->v[2] + b->v[2];
}

//-- Return the Euclidean norm
float point3d_norm(const point3d_t* a) {
  return sqrt(point3d_dot(a, a));
}

//-- Scale a vector by the scalar x
void point3d_scale(point3d_t* p, float x) {
  p->v[0] *= x;
  p->v[1] *= x;
  p->v[2] *= x;
}

//-- Negate a vector
void point3d_negate(point3d_t* p) {
  p->v[0] = -p->v[0];
  p->v[1] = -p->v[1];
  p->v[2] = -p->v[2];
}

//-- Scale the vector such that it has length 1
void point3d_normalize(point3d_t* p) {
  point3d_scale(p, 1.0/point3d_norm(p));
}

//-- Determine if two vectors are antipodal to the limit of float prescision
int point3d_are_antipodal(const point3d_t* p1, const point3d_t* p2) {
  return (p1->v[0] - p2->v[0] == 0.0) &&
         (p1->v[1] - p2->v[1] == 0.0) &&
         (p1->v[2] - p2->v[2] == 0.0);
}

//-- Set the vector to be a random unit vector.  The horizontal projection from
//   the cylinder with radius 1 is measure-preserving, so this should be uniform
void point3d_get_random_unit(point3d_t* p) {
  float rand1 = ((float)random()) / ((float)(1U<<31));
  float rand2 = ((float)random()) / ((float)(1U<<31));
  float angle = 2.0*PI*rand1;
  float z = 2.0*rand2 - 1.0;
  float xy_radius = sqrt(1.0-z*z);
  p->v[0] = cos(angle)*xy_radius;
  p->v[1] = sin(angle)*xy_radius;
  p->v[2] = z;
  
}



/*****************************************************************************
 * A spherical cap
 *  A point x lies in the spherical cap if x.center >= dot_cutoff
 *****************************************************************************/
typedef struct {
  point3d_t center;
  float dot_cutoff;
} scap_t;

//-- Print a scap to stdout
void scap_print(const scap_t* s) {
  printf("Scap(");
  point3d_print(&s->center);
  printf(", %f)\n", s->dot_cutoff);
}

//-- Find the area of a scap; note that because the dot cutoff is for unit
//   vectors, we have <center,x>center is the projection of x to center; hence
//   <x,center> is the length along the center vector.  Thus 1-dot_cutoff
//   is the height of the cap
float scap_area(const scap_t* s) {
  return 2*PI*(1.0 - s->dot_cutoff);
}

//-- Get the scap defined by two points; just add the points to get the 
//   point in the middle and scale.  There is no protection against dividing
//   by zero
void scap_from_pair(scap_t* s, point3d_t* p1, point3d_t* p2) {
  point3d_add(&s->center, p1, p2);
  point3d_normalize(&s->center);
  s->dot_cutoff = point3d_dot(&s->center, p1);
}
  

//-- Find the discrepancy of a cap, given a set of points
float scap_discrepancy(const scap_t* s, const point3d_t* P, int num_points, float epsilon) {
  
  float N = (float)num_points;
  
  //Count the number of points contained in this scap
  //Note any point whose dot product is exactly on the circle can go either way
  float num_in = 0;
  float num_out = 0;
  float num_on = 0;
  for (int i=0; i<num_points; ++i) {
    float d = point3d_dot(&s->center, P+i);
    if (d > s->dot_cutoff + epsilon) {
      num_in += 1.0;
    } else if (d < s->dot_cutoff - epsilon) {
      num_out += 1.0;
    } else {
      num_on += 1.0;
    }
  }
  
  //Get the scap usual measure and its complement
  float in_area = scap_area(s);
  float out_area = UNIT_AREA - in_area;
  
  //Compute the point measure inside and the two discrepancies
  float in_point_measure = num_in/N;
  float in_d_1 = abs(in_point_measure - in_area);
  in_point_measure += num_on/N;
  float in_d_2 = abs(in_point_measure - in_area);
  float in_discrep = (in_d_1 > in_d_2 ? in_d_1 : in_d_2);
  
  //Compute the measure outside and those discrepancies
  float out_point_measure = num_out/N;
  float out_d_1 = abs(out_point_measure - out_area);
  out_point_measure += num_on/N;
  float out_d_2 = abs(out_point_measure - out_area);
  float out_discrep = (out_d_1 > out_d_2 ? out_d_1 : out_d_2);
  
  if (in_discrep > out_discrep) {
    return in_discrep;
  } else {
    return out_discrep;
  }
}







/*****************************************************************************
 * Find the discrepancy of a collection of points by iterating over all
 * pairs and triples.  Epsilon gives comparison to zero.
 *****************************************************************************/
int discrepancy(point3d_t* P, 
                int num_points,
                float epsilon,
                float* discrepancy,
                scap_t* maximal_cap,
                int verbose) {
  float max_d = 1.0/num_points;
  scap_t max_cap;
  max_cap.center = P[0];
  max_cap.dot_cutoff = 0.0;
  scap_t temp_cap;
  
  if (verbose>0) {
    printf("Finding discrepancy of %d points with epsilon=%f\n", num_points, epsilon);
  }
  
  //Iterate through all pairs of points
  for (int i=0; i<num_points; ++i) {
    for (int j=i+1; j<num_points; ++j) {
    
      //If these points are antipodal, then don't don't fix a circle (assuming there's > 2 points)
      if (point3d_are_antipodal(P+i, P+j)) continue;
      
      //Find the cap given by this pair
      scap_from_pair(&temp_cap, P+i, P+j);
      
      //Get the discrepancy of this cap and compare it
      float d = scap_discrepancy(&temp_cap, P, num_points, epsilon);
      if (d > max_d) {
        max_d = d;
        max_cap = temp_cap;
      }
    }
  }
  
  //Iterate through all triples
  for (int i=0; i<num_points; ++i) {
    for (int j=i+1; j<num_points; ++j) {
      for (int k=j+1; k<num_points; ++k) {
        //Find the cap given by this triple
        scap_from_triple(&temp_cap, P+i, P+j, P+k);
        
        //Get the discrepancy of this cap and compare it
        float d = scap_discrepancy(&temp_cap, P, num_points, epsilon);
        if (d > max_d) {
          max_d = d;
          max_cap = temp_cap;
        }
      }
    }
  } 
  
  *discrepancy = max_d;
  *maximal_cap = max_cap;
  return 0;
}










int main(int argc, char* argv[]) {
  if (argc < 2) {
    printf("Usage: ./discrep -rn [-v]\n");
    printf("  -rn:generate n points randomly and find the discrepancy\n");
    printf("   -v: be verbose\n");
    printf("Example: ./discrep -r5\n");
    return 0;
  }
  
  int num_points = 0;
  int verbose=0;
  
  int current_arg = 1;
  while (current_arg < argc) {
    if (argv[current_arg][1] == 'r') {
      num_points = atoi(&argv[1][2]);
    } else if (argv[current_arg][1] == 'v') {
      verbose = 1;
    }
    ++current_arg;
  }
  
  if (verbose>0) {
    printf("Generating %d random points\n", num_points);
  }
  
  point3d_t* points = (point3d_t*)malloc(num_points*sizeof(point3d_t));
  srandom(0);
  for (int i=0; i<num_points; ++i) {
    point3d_get_random_unit(points + i);
  }
  
  if (verbose>0) {
    printf("Generated points:\n");
    for (int i=0; i<num_points; ++i) {
      point3d_print(points + i);
      printf("\n");
    }
  }
  
  
  float discrep;
  scap_t maximal_cap;
  
  if (discrepancy(points, num_points, 1.0e-6, &discrep, &maximal_cap, verbose)) {
    printf("Error\n");
    return 1;
  }
  
  printf("Discrepancy: %f\n", discrep);
  if (verbose>0) {
    printf("Maximal cap:\n");
    scap_print(&maximal_cap);
  }
  
  return 0;
}















