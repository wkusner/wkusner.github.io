#ifndef __POINT3D__
#define __POINT3D__

#define PI 3.14159265358979
#define UNIT_AREA 12.5663706143592

/****************************************************************************
 * A vector of 3 floats type
 ****************************************************************************/
typedef struct { 
  float v[3];
} point3d_t;

void point3d_print(const point3d_t* p);
float point3d_dot(const point3d_t* a, const point3d_t* b);
void point3d_add(point3d_t* x, const point3d_t* a, const point3d_t* b);
void point3d_sub(point3d_t* x, const point3d_t* a, const point3d_t* b);
void point3d_cross(point3d_t* x, const point3d_t* a, const point3d_t* b);
void point3d_perp(point3d_t* x, const point3d_t* a, const point3d_t* b);
void point3d_copy(point3d_t* x, const point3d_t* a);
float point3d_norm(const point3d_t* a);
void point3d_scale(point3d_t* p, float x);
void point3d_negate(point3d_t* p);
void point3d_normalize(point3d_t* p);
int point3d_are_antipodal(const point3d_t* p1, const point3d_t* p2);
void point3d_get_random_unit(point3d_t* p);
void point3d_sphere_to_cylinder(const point3d_t* p, float* angle, float* height);
void point3d_cylinder_to_sphere(point3d_t* p, float angle, float height);
int point3d_read_csv(const char* filename, point3d_t** P, int* num_points);
float point3d_difference_norm(const point3d_t* a, const point3d_t* b );
float point3d_antipodal_angle(float a);
float point3d_relative_angle(point3d_t* a, const point3d_t* b, const point3d_t* c);



#endif