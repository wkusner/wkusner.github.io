#include <stdlib.h>
#include <stdio.h>
#include <math.h>
 
#include "scap.h"


/*****************************************************************************
 * Do a binary search of the given list of float key pairs.  If which_side < 0, 
 * it returns the index of the list entry which is smaller than (and closest to)
 * x.  If which side > 0, then it returns the entry which is larger than (and 
 * closest to) x.  It returns -1 if such an entry does not exist in either case.
 * Here smaller than and larger than are "or equal"
 *****************************************************************************/
int float_key_pair_bsearch_closest(const float_key_pair_t* L, int num_keys, float x, int which_side) {
  //printf("Searching list for %f on side: %d\n", x, which_side);
  int base = 0;
  int len = num_keys;
  if ( (which_side < 0 && x < L[0].key) ||
       (which_side > 0 && x > L[num_keys-1].key) ) {
    return -1;
  }
  if (num_keys == 1) {
    return 0;
  }
  while (1) {
    int middle_index_left = (len / 2) - 1;
    int middle_index_right = len / 2;
    //printf("Base: %d, len: %d, left middle: %d, right middle: %d, L vals: %f,%f\n", base, len, middle_index_left, middle_index_right, L[base + middle_index_right].key, L[base + middle_index_left].key);
    if (L[base + middle_index_right].key < x) {            //In the right list
      base = base + middle_index_right;
      len = len - middle_index_right;
    } else if (L[base + middle_index_left].key <= x) {      //In between
      return (which_side < 0 ? base + middle_index_left 
                             : base + middle_index_right);
    } else {                                               //In the left list
      len = middle_index_right;
    }
  }
}

/*****************************************************************************
 * Compare float key pairs
 *****************************************************************************/
int float_key_pair_cmp(const void* a, const void* b) {
  float ak = ((float_key_pair_t*)a)->key;
  float bk = ((float_key_pair_t*)b)->key;
  if (ak < bk) {
    return -1;
  } else if (ak > bk) {
    return 1;
  } else {
    return 0;
  }
}

/*****************************************************************************
 * Find the number of entries in the (sorted) list with the same key as
 * the index given.  The return value includes the index given (it is >= 1)
 *****************************************************************************/
int float_key_pair_num_shared_key(const float_key_pair_t* L, int num_keys, int ind, float epsilon) {
  int start_ind = ind-1;
  while ( start_ind >= 0 && L[ind].key - L[start_ind].key < epsilon ) {
    start_ind -=1;
  }
  int end_ind = ind+1;
  while ( end_ind < num_keys && L[end_ind].key - L[ind].key < epsilon ) {
    end_ind += 1;
  }
  return end_ind - start_ind - 1;
}

/*****************************************************************************
 * Find the number of entries in the (sorted) list which have a key which is
 * greater than ind1 key +epsilon and less than ind2 key - epsilon.  Note that
 * ind1 is allowed to be larger than ind2, in which case the number goes 
 * circularly around
 *****************************************************************************/
int float_key_pair_circular_contained(const float_key_pair_t* L, int num_keys, int ind1, int ind2, float epsilon) {
  int end_ind_1 = ind1;
  while (end_ind_1 < num_keys && L[end_ind_1].key - L[ind1].key < epsilon) {
    end_ind_1 += 1;
  }
  int start_ind_2 = ind2;
  while (start_ind_2 >= 0 && L[ind2].key - L[start_ind_2].key < epsilon) {
    start_ind_2 -= 1;
  }
  if (ind2 >= ind1) {
    if (start_ind_2 <= end_ind_1) return 0;
    int num = start_ind_2 - end_ind_1 + 1;
    return (num >= 0 ? num : 0);
  }
  int num1 = num_keys - end_ind_1;
  int num2 = start_ind_2 + 1;
  return num1 + num2;
}


/*****************************************************************************
 * Print to stdout
 *****************************************************************************/
void scap_print(const scap_t* s) {
  printf("Scap(");
  point3d_print(&s->center);
  printf(", %f)\n", s->dot_cutoff);
}

/*****************************************************************************
 * Find the area of a scap; note that because the dot cutoff is for unit
 * vectors, we have <center,x>center is the projection of x to center; hence
 * <x,center> is the length along the center vector.  Thus 1-dot_cutoff
 * is the height of the cap. 
 *****************************************************************************/
float scap_area(const scap_t* s) {
  return 2*PI*(1.0 - s->dot_cutoff);
}

/*****************************************************************************
 * Find the scap area, normalized so the area of the sphere is 1
 *****************************************************************************/
float scap_area_normalized(const scap_t* s) {
  return 0.5*(1.0 - s->dot_cutoff);
}

/*****************************************************************************
 * Get the scap defined by two points; just add the points to get the 
 * point in the middle and scale.  There is no protection against dividing
 * by zero
 *****************************************************************************/ 
void scap_from_pair(scap_t* s, const point3d_t* p1, const point3d_t* p2) {
  point3d_add(&s->center, p1, p2);
  point3d_normalize(&s->center);
  s->dot_cutoff = point3d_dot(&s->center, p1);
}

/*****************************************************************************
 * Get the scap defined by three points; just find the normal to the plane
 * through the points; this normal has to give the center.
 *****************************************************************************/
void scap_from_triple(scap_t* s, 
                      const point3d_t* p1,
                      const point3d_t* p2,
                      const point3d_t* p3) {
  point3d_t p3p1, p3p2;
  point3d_sub(&p3p1, p3, p1);
  point3d_sub(&p3p2, p3, p2);
  
  //This cross product gives the plane normal
  point3d_cross(&s->center, &p3p1, &p3p2);
  point3d_normalize(&s->center);
  
  //To find the dot cutoff, we can just dot with any of the inputs
  s->dot_cutoff = point3d_dot(&s->center, p1);
}

/*****************************************************************************
 * Find the discrepancy of a cap, given a set of points.  Epsilon gives the 
 * range considered to be zero for floats
 *****************************************************************************/
float scap_discrepancy(const scap_t* s,
                       const point3d_t* P,
                       int num_points,
                       float epsilon,
                       const scap_containment_precomputation_t* SC) {
  
  float N = (float)num_points;
  
  float num_in = 0;
  float num_out = 0;
  float num_on = 0;
  
  if (SC == NULL || SC->num_reference_centers == 0) {
    //Count the number of points contained in this scap in a naive way
    //Note any point whose dot product is exactly on the circle can go either way
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
  
  } else {
    //If we actually have a precomputation, then use it
    //First, hash the center to one of the hash boxes
    float angle, height;
    
    //Get the angle and height; note the angle is in the range [-pi/2,pi/2]
    point3d_sphere_to_cylinder(&s->center, &angle, &height);
    
    //If the angle is negative, add 2PI so it's positive
    if (angle<0) angle += 2.0*PI;
    
    //Get the indices of the hash boxes for the angle and height
    int angle_ind = (int)( angle / (SC->hash_box_angle+(1.0e-8)) );
    int height_ind = (int)( (height + 1.0)/SC->hash_box_height );
    int reference_ind = height_ind * SC->num_hash_boxes_angle + angle_ind;
    //point3d_print(&s->center);
    //printf("%f, %f, %f, %d, %d, %d, %d, %d\n", angle, height, angle /(SC->hash_box_angle+(1.0e-8)), angle_ind, height_ind, reference_ind, SC->num_hash_boxes_angle, SC->num_hash_boxes_height);
    
    //Get the list of dot product keys for this reference center
    float_key_pair_t* this_ref_dot_list = SC->reference_center_dot_prods + reference_ind*SC->num_input_points;
    
    //If c is the scap center and r the ref point, and x some other vector, 
    //then |<c,x>-<c,r>| = |<c,x-r>| <= ||x-r||, so we get a bound on the error
    float diff_norm = point3d_difference_norm( SC->reference_centers + reference_ind, &s->center );
    //printf("Finding discrep of:");
    //scap_print(s);
    //printf(" got reference coords (%d, %d) (angle,height=%f %f), which has reference center ", angle_ind, height_ind, angle, height);
    //point3d_print(SC->reference_centers + reference_ind);
    //printf("\n");
    float dot_prod_min = s->dot_cutoff - diff_norm;
    float dot_prod_max = s->dot_cutoff + diff_norm;
    //printf("\nGot diff norm of %f and dot prod range %f,%f\n", diff_norm, dot_prod_min, dot_prod_max);
    int below, above;
    //for (int i=0; i<SC->num_input_points; ++i) {
    //  float_key_pair_t* temp = SC->reference_center_dot_prods + reference_ind*SC->num_input_points + i;
    //  printf("(%f,%d) ", temp->key, temp->index);
    //}
    below = float_key_pair_bsearch_closest(this_ref_dot_list,
                                           SC->num_input_points, dot_prod_min-epsilon, -1);
    above = float_key_pair_bsearch_closest(this_ref_dot_list,
                                           SC->num_input_points, dot_prod_max+epsilon, 1);

    //printf("\nFound bounding indices %d, %d\n", below, above);
    if (below < 0) {
      num_out = 0;
      below = -1;
    } else {
      num_out = below;
    }
    if (above < 0) {
      num_in = 0;
      above = SC->num_input_points;
    } else {
      num_in = SC->num_input_points-above;
    }
    num_on = 0;
    int num_to_check = (above - below - 1);
    //printf("Scanning %d points starting at %d\n", num_to_check, below+1);
    for (int i=0; i<num_to_check; ++i) {
      float_key_pair_t* dot_prod_pair = this_ref_dot_list + below + i + 1;
      float d = point3d_dot(&s->center, &P[dot_prod_pair->index]);
      if (d > s->dot_cutoff + epsilon) {
        num_in += 1.0;
      } else if (d < s->dot_cutoff - epsilon) {
        num_out += 1.0;
      } else {
        num_on += 1.0;
      }
    }
    //printf("Got final in, out, on: %.0f, %.0f, %.0f\n", num_in, num_out, num_on);
  }
  
  //Get the scap usual measure and its complement
  float in_area = scap_area_normalized(s);
  //float out_area = 1.0 - in_area;
  
  //scap_print(s);
  //printf("Counted in:%f out:%f on:%f, area:%f, %f\n", num_in, num_out, num_on, in_area, out_area);
  
  //Compute the point measure inside and the two discrepancies
  float in_point_measure = num_in/N;
  float in_d_1 = fabs(in_point_measure - in_area);
  in_point_measure += num_on/N;
  float in_d_2 = fabs(in_point_measure - in_area);
  float in_discrep = (in_d_1 > in_d_2 ? in_d_1 : in_d_2);
  
  //Compute the measure outside and those discrepancies
  //(Note these will be the same discrepancies)
//   float out_point_measure = num_out/N;
//   float out_d_1 = fabs(out_point_measure - out_area);
//   out_point_measure += num_on/N;
//   float out_d_2 = fabs(out_point_measure - out_area);
//   float out_discrep = (out_d_1 > out_d_2 ? out_d_1 : out_d_2);
//   
//   printf("in discrep: %f (%f,%f); out discrep: %f(%f,%f)\n", in_discrep, in_d_1, in_d_2, out_discrep, out_d_1, out_d_2);
//   
//   if (in_discrep > out_discrep) {
//     return in_discrep;
//   } else {
//     return out_discrep;
//   }
  
  return in_discrep;

}

/*****************************************************************************
 * Create precomputation data.  We want to output approximately log(n) points
 * for secondary testing.  This means that each hash box needs to have width 
 * about log(n)/n, and we should have about n/log(n) of them in each direction
 *****************************************************************************/
void scap_precompute(const point3d_t* points,
                     int num_points,
                     scap_containment_precomputation_t* SC,
                     int verbose) {
  float nologn = (float)num_points / log((float)num_points);
  SC->input_points = points;
  SC->num_input_points = num_points;
  SC->num_hash_boxes_angle = (int)nologn;
  SC->num_hash_boxes_height = (int)nologn;
  int num_hash_boxes = SC->num_hash_boxes_angle * SC->num_hash_boxes_height;
  
  //If there are too few points
  if (num_hash_boxes < 50) {
    if (verbose>0) printf("Too few points for the precomputation to make sense\n");
    SC->num_reference_centers = 0;
    return;
  }
  SC->num_reference_centers = num_hash_boxes;
  float total_bytes = num_hash_boxes*sizeof(point3d_t) + 
                      num_hash_boxes*num_points*sizeof(float_key_pair_t);
  if (verbose>0) {
    printf("Precomputing data for %d input points\n", num_points);
    printf("Has grid dimensions: %d, %d\n", SC->num_hash_boxes_angle , SC->num_hash_boxes_height);
    printf("This will require about %fMB of memory\n", total_bytes / 1.0e6);
  }
  
  SC->reference_centers = (point3d_t*)malloc(num_hash_boxes*sizeof(point3d_t));
  SC->reference_center_dot_prods = (float_key_pair_t*)malloc(num_hash_boxes*num_points*sizeof(float_key_pair_t));
  
  SC->hash_box_angle = 2.0*PI / (float)SC->num_hash_boxes_angle;
  SC->hash_box_height = 2.0 / SC->num_hash_boxes_height;
  
  for (int i=0; i<SC->num_hash_boxes_height; ++i) {
    int ind_offset = i*SC->num_hash_boxes_angle;
    for (int j=0; j<SC->num_hash_boxes_angle; ++j) {
      point3d_t temp;
      point3d_cylinder_to_sphere( &temp,
                                  (j+0.5)*SC->hash_box_angle,
                                  -1.0 + (i+0.5)*SC->hash_box_height);
      
      float_key_pair_t* current_keys = SC->reference_center_dot_prods + (i*SC->num_hash_boxes_angle+j)*num_points;
      for (int k=0; k<num_points; ++k) {
        current_keys[k].index = k;
        current_keys[k].key = point3d_dot(&temp, points+k);
      }
      qsort((void*)current_keys, num_points, sizeof(float_key_pair_t), float_key_pair_cmp);
      SC->reference_centers[ind_offset + j] = temp;
      //printf("Made precomputation list for reference point (%d,%d): ", i,j);
      //point3d_print(&temp);
      //printf(":\n");
      //for (int k=0; k<num_points; ++k) {
      //  printf("(%f %d) ", current_keys[k].key, current_keys[k].index);
      //}
      //printf("\n");
    }
  }
    
}


/*****************************************************************************
 * Free the memory
 *****************************************************************************/
void scap_precompute_free(scap_containment_precomputation_t* SC) {
  free(SC->reference_centers);
  free(SC->reference_center_dot_prods);
}





































