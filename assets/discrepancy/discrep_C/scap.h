#ifndef __SCAP__
#define __SCAP__

#include "point3d.h"


/*****************************************************************************
 * A spherical cap
 *  A point x lies in the spherical cap if x.center >= dot_cutoff
 *****************************************************************************/
typedef struct {
  point3d_t center;
  float dot_cutoff;
} scap_t;

/*****************************************************************************
 * A pair used for sorting a list based on a float key
 *****************************************************************************/
typedef struct {
  float key;
  int index;
} float_key_pair_t;

//These functions search and sort float_key_pairs
int float_key_pair_bsearch_closest(const float_key_pair_t* L, int num_keys, float x, int which_side);
int float_key_pair_cmp(const void* a, const void* b);
int float_key_pair_num_shared_key(const float_key_pair_t* L, int num_keys, int ind, float epsilon);
int float_key_pair_circular_contained(const float_key_pair_t* L, int num_keys, int ind1, int ind2, float epsilon);

/*****************************************************************************
 * Scap containment precomputation data.  This contains the necessary 
 * information to quickly count how many points are in or out of a 
 * cap.  The is one reference point in the center of every hash box.  The list
 * of reference points is flattened as [row 0][row 1]...  I.e. the reference 
 * point in box i, j is reference_centers[i*num_hash_boxes_angle + j].  
 * The dot prods are stored as [dot prods for 0][dot prods for 1]... (a single list)
 *****************************************************************************/
typedef struct {
  const point3d_t* input_points;                         //The input points for which this was created
  int num_input_points;
  point3d_t* reference_centers;                    //The reference centers
  int num_reference_centers;
  float_key_pair_t* reference_center_dot_prods;  //For each reference center, a sorted list of the dot prods for every input point
  
  float hash_box_angle;      //The angle which a hash box occupies
  int num_hash_boxes_angle;  //The total number of hash boxes horizontally
  float hash_box_height;     //The height which a hash box occupies
  int num_hash_boxes_height; //The total number of hash boxes vertically
} scap_containment_precomputation_t;



void scap_print(const scap_t* s);
float scap_area(const scap_t* s);
float scap_area_normalized(const scap_t* s);
void scap_from_pair(scap_t* s, const point3d_t* p1, const point3d_t* p2);
void scap_from_triple(scap_t* s, const point3d_t* p1, const point3d_t* p2, const point3d_t* p3);
float scap_discrepancy(const scap_t* s, 
                       const point3d_t* P, 
                       int num_points, 
                       float epsilon, 
                       const scap_containment_precomputation_t* SC);
void scap_precompute(const point3d_t* points, int num_points, scap_containment_precomputation_t* SC, int verbose);
void scap_precompute_free(scap_containment_precomputation_t* SC);






#endif