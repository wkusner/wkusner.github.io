#include <stdlib.h>
#include <stdio.h>
#include <math.h>

#include "point3d.h"


/****************************************************************************
 * Print to stdout
 ****************************************************************************/
void point3d_print(const point3d_t* p) {
  printf("[%f, %f, %f]", p->v[0], p->v[1], p->v[2]);
}

/****************************************************************************
 * Return the dot product of a and b 
 ****************************************************************************/
float point3d_dot(const point3d_t* a, const point3d_t* b) {
  return a->v[0]*b->v[0] + a->v[1]*b->v[1] + a->v[2]*b->v[2];
}

/****************************************************************************
 * Set x to be a+b
 ****************************************************************************/
void point3d_add(point3d_t* x, const point3d_t* a, const point3d_t* b) {
  x->v[0] = a->v[0] + b->v[0];
  x->v[1] = a->v[1] + b->v[1];
  x->v[2] = a->v[2] + b->v[2];
}

/****************************************************************************
 * Set x to be a-b
 ****************************************************************************/
void point3d_sub(point3d_t* x, const point3d_t* a, const point3d_t* b) {
  x->v[0] = a->v[0] - b->v[0];
  x->v[1] = a->v[1] - b->v[1];
  x->v[2] = a->v[2] - b->v[2];
}

/****************************************************************************
 * Set x to be a cross b
 ****************************************************************************/
void point3d_cross(point3d_t* x, const point3d_t* a, const point3d_t* b) {
  x->v[0] = a->v[1]*b->v[2] - a->v[2]*b->v[1];
  x->v[1] = a->v[2]*b->v[0] - a->v[0]*b->v[2];
  x->v[2] = a->v[0]*b->v[1] - a->v[1]*b->v[0];
}

/****************************************************************************
 * Set x to be a - proj_b(a) (the vector from the line through b perp to a)
 ****************************************************************************/
void point3d_perp(point3d_t* x, const point3d_t* a, const point3d_t* b) {
  float bdb = point3d_dot(b,b);
  float adb = point3d_dot(a,b);
  point3d_t p;
  point3d_copy(&p, b);
  point3d_scale(&p, adb / bdb );
  point3d_sub(x, a, &p);
}

/****************************************************************************
 * Set x to be a
 ****************************************************************************/
void point3d_copy(point3d_t* x, const point3d_t* a) {
  x->v[0] = a->v[0];
  x->v[1] = a->v[1];
  x->v[2] = a->v[2];
}

/****************************************************************************
 * Return the Euclidean norm
 ****************************************************************************/
float point3d_norm(const point3d_t* a) {
  return sqrt(point3d_dot(a, a));
}

/****************************************************************************
 * Scale a vector by the scalar x
 ****************************************************************************/
void point3d_scale(point3d_t* p, float x) {
  p->v[0] *= x;
  p->v[1] *= x;
  p->v[2] *= x;
}

/****************************************************************************
 * Negate a vector
 ****************************************************************************/
void point3d_negate(point3d_t* p) {
  p->v[0] = -p->v[0];
  p->v[1] = -p->v[1];
  p->v[2] = -p->v[2];
}

/****************************************************************************
 * Scale a vector so that it has length 1
 ****************************************************************************/
void point3d_normalize(point3d_t* p) {
  point3d_scale(p, 1.0/point3d_norm(p));
}

/****************************************************************************
 * Determine if two vectors are antipodal to the limit of float precision
 ****************************************************************************/
int point3d_are_antipodal(const point3d_t* p1, const point3d_t* p2) {
  return (p1->v[0] - p2->v[0] == 0.0) &&
         (p1->v[1] - p2->v[1] == 0.0) &&
         (p1->v[2] - p2->v[2] == 0.0);
}

/****************************************************************************
 * Set the vector to be a random unit vector.  The horizontal projection from
 * the cylinder with radius 1 is measure-preserving, so this should be uniform
 ****************************************************************************/
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

/****************************************************************************
 * Return the angle from the positive x axis and the height (i.e. coordinates
 * on the cylinder.
 ****************************************************************************/
void point3d_sphere_to_cylinder(const point3d_t* p, float* angle, float* height) {
  *height = p->v[2];
  *angle = atan2(p->v[1], p->v[0]);
}

/****************************************************************************
 * Go the other direction
 ****************************************************************************/
void point3d_cylinder_to_sphere(point3d_t* p, float angle, float height) {
  float x,y,z;
  z = height;
  x = cos(angle);
  y = sin(angle);
  float s = sqrt( (1.0-z*z)/(x*x + y*y) );
  x *= s;
  y *= s;
  p->v[0] = x;
  p->v[1] = y;
  p->v[2] = z;
}

/****************************************************************************
 * Read a csv file into an array of points.  The array is created in 
 * this function.  Returns 0 on success.
 ****************************************************************************/
int point3d_read_csv(const char* filename, point3d_t** P, int* num_points) {
  FILE* f = fopen(filename, "r");
  if (f == NULL) {
    printf("Error opening file\n");
    return 1;
  }
  
  //Scan to find the number of points
  *num_points = 0;
  while ( fscanf(f, " %*f,%*f,%*f\n") != EOF) {
    *num_points += 1;
  }
  
  //Rewind
  fseek(f, 0, SEEK_SET);
  
  //Create the array
  *P = (point3d_t*)malloc((*num_points)*sizeof(point3d_t));
  
  //Read through to get the points
  for (int i=0; i<*num_points; ++i) {
    fscanf(f, "%f,%f,%f\n", (*P)[i].v, (*P)[i].v+1, (*P)[i].v+2);
  }
  
  //Close the file
  fclose(f);
  
  return 0;
}

/****************************************************************************
 * Return ||a-b||
 ****************************************************************************/
float point3d_difference_norm(const point3d_t* a, const point3d_t* b ) {
  float x = a->v[0] - b->v[0];
  float y = a->v[1] - b->v[1];
  float z = a->v[2] - b->v[2];
  return sqrt(x*x + y*y + z*z);
}


/****************************************************************************
 * Return the angle which is a + pi, translated to the correct range
 ****************************************************************************/
float point3d_antipodal_angle(float a) {
  float ap = a + PI;
  if (ap > PI) ap -= 2*PI;
  return ap;
}

/****************************************************************************
 * Take the line generated by b.  It must be perpendicular to a and c (well,
 * at least not colinear).  This finds the angle between a and c when facing 
 * in the direction of b (a then c is a positive basis when facing through b means a positive angle)
 ****************************************************************************/
float point3d_relative_angle(point3d_t* a, const point3d_t* b, const point3d_t* c) {
  float dp = point3d_dot(a, c);
  point3d_t cr;
  point3d_cross(&cr, c, a);
  float cdcr = point3d_dot(&cr, b);
  float sign = (cdcr > 0 ? 1 : -1);
  float na = point3d_norm(a);
  float nc = point3d_norm(c);
  float angle = acos(dp/(na*nc));
  return sign*angle;
}





























