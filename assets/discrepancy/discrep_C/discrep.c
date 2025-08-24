/* discrep.c
 *
 * Given a list of points on the unit sphere, iterate over all pairs
 * and triples of points.  For each pair and triple, compute the circle defined
 * by them, and find the discrepancy of that spherical cap (and its antipode)
 */
 
//Compile with: make

#include <stdlib.h>
#include <stdio.h>
#include <math.h>

#include "point3d.h"
#include "scap.h"


/*****************************************************************************
 * Find the discrepancy of a collection of points by iterating over all
 * pairs and triples.  Epsilon gives comparison to zero.  If the 
 * scap_containment_precomputation_t isn't NULL, it will make it faster
 *****************************************************************************/
int discrepancy(point3d_t* P, 
                int num_points,
                float epsilon,
                scap_containment_precomputation_t* SC, 
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
      
      //printf("Trying pair (%d,%d)\n", i, j);
      
      //Find the cap given by this pair
      scap_from_pair(&temp_cap, P+i, P+j);
      
      //Get the discrepancy of this cap and compare it
      float d = scap_discrepancy(&temp_cap, P, num_points, epsilon, SC);
      
      //printf("Got discrepancy %f\n", d);
      
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
        
        //printf("Trying triple (%d,%d,%d)\n", i,j,k);
        
        //Find the cap given by this triple
        scap_from_triple(&temp_cap, P+i, P+j, P+k);
        
        //printf("Got scap:\n");
        //scap_print(&temp_cap);
        
        //Get the discrepancy of this cap and compare it
        float d = scap_discrepancy(&temp_cap, P, num_points, epsilon, SC);
        //float d2 = scap_discrepancy(&temp_cap, P, num_points, epsilon, NULL);
        //if (fabs(d-d2) > epsilon) {
        //  printf("Got %f and %f for discreps\n", d, d2);
        //  exit(1);
        //}
        
        //printf("Got discrepancy: %f\n", d);
        
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


/*****************************************************************************
 * Find the discrepancy of a collection of points by the iterate-and-sort
 * method: iterate over all pairs of points, then sort the rest based on their
 * angle from the line between the pair.  We can then just scan through all
 * discrepancies with that pair.
 *****************************************************************************/ 
int halfspace_discrepancy(point3d_t* P, 
                          int num_points,
                          float epsilon,
                          float* discrepancy,
                          scap_t* maximal_cap,
                          int verbose) {
  
  float max_d = 1.0/num_points;
  float N = (float)num_points;
  scap_t max_cap;
  max_cap.center = P[0];
  max_cap.dot_cutoff = 0.0;
  scap_t temp_cap;
  
  //Array for the other points
  point3d_t* other_points_proj = (point3d_t*)malloc((num_points-2)*sizeof(point3d_t));
  float_key_pair_t* other_points = (float_key_pair_t*)malloc((num_points-2)*sizeof(float_key_pair_t));
  
  
  for (int i=0; i<num_points; ++i) {
    for (int j=i+1; j<num_points; ++j) {
      
      //First check the cap defined by just these points as a special case
      scap_t temp_cap;
      scap_from_pair(&temp_cap, P+i, P+j);
      float d = scap_discrepancy(&temp_cap, P, num_points, epsilon, NULL);
      if (d > max_d) {
        max_d = d;
        max_cap = temp_cap;
      }      
      
      // --------------------- Create the list of other point angles ----------
      
      //Compute the relative angle of the other points from the line spanned
      //by this pair of points
      point3d_t bma;
      point3d_sub(&bma, P+j, P+i);
      point3d_t temp_diff;
      
      int insert_index = 0;
      for (int k=0; k<num_points; ++k) {
        if (k==i || k == j) continue;
        other_points[insert_index].index = k;
        point3d_sub(&temp_diff, P+k, P+i);
        point3d_perp(other_points_proj + insert_index, &temp_diff, &bma);
        insert_index += 1;
      }
      
      for (int k=0; k<num_points-2; ++k) {
        other_points[k].key = point3d_relative_angle(other_points_proj+0, &bma, other_points_proj+k);
      }
      
      //Sort this array
      qsort((void*)other_points, num_points-2, sizeof(float_key_pair_t), float_key_pair_cmp);
      
      //Now scan through the array; for any point with index > j (we only
      //want to consider each triple exactly once), check to see how many points
      //lie to one side of the halfspace defined by the three points.  Then 
      //compute the scap area to get the discrepancy
      
      //This is the index of the other point which we are considering
      float other_point_angle = other_points[0].key;
      
      //Find the index of the point such that it is on or after the
      //antipodal angle.
      float antipodal_angle = point3d_antipodal_angle(other_point_angle);
      int antipodal_point_index = float_key_pair_bsearch_closest(other_points, num_points-2, antipodal_angle, 1);
      if (antipodal_point_index == -1) antipodal_point_index = 0;
      
      // ----------------------- Scan the other points -----------------------
      
      //Now we can start our scan.
      for (int k=0; k<num_points-2; ++k) {
        
        //We don't bother computing unless this last index would be bigger than j
        if (other_points[k].index > j) {
        
          //We need to find all the points with the "same angle" as our anchor point
          int num_points_on_start = float_key_pair_num_shared_key(other_points, num_points-2, k, epsilon);
        
          //If the antopodal point is within epsilon, that means that *some* point 
          //is within epsilon, so we need to check how many are
          int num_points_on_antipode = 0;
          if ( fabs(other_points[antipodal_point_index].key - antipodal_angle) < epsilon ) {
            num_points_on_antipode = float_key_pair_num_shared_key(other_points, num_points-2, antipodal_point_index, epsilon);
          }
        
          float num_on = 2 + num_points_on_start + num_points_on_antipode;
          float num_in = float_key_pair_circular_contained(other_points, num_points-2, k, antipodal_point_index, epsilon);
          float in_point_measure = num_in/N;
          
          float in_d_1 = fabs(in_point_measure - in_area);
          in_point_measure += num_on/N;
          float in_d_2 = fabs(in_point_measure - in_area);
          float in_discrep = (in_d_1 > in_d_2 ? in_d_1 : in_d_2);
          if (in_discrep > max_d) {
            max_d = in_discrep;
            scap_from_triple(&max_cap, P+i, P+j, P+other_points[k].index);
          }
        }
        //Now we have to advance the antipodal index and angle
        if (k < num_points-3) {
          float old_antipodal_angle = antipodal_angle;
          float new_antipodal_angle = point3d_antipodal_angle(other_points[k+1].key);
          while (point3d_cyclically_ordered_angles(old_antipodal_angle,
                                                   other_points[antipodal_point_index].key,
                                                   new_antipodal_angle)) {
            antipodal_point_index += 1;
            if (antipodal_point_index >=num_points-2) antipodal_point_index = 0;
          }
        }
        
      }
      // --------------------- Done scanning this pair ----------------------
      
    }
  }
  
  *discrepancy = max_d;
  *maximal_cap = max_cap;
  
  return 0;
}


int main(int argc, char* argv[]) {
  if (argc < 2) {
    printf("Usage: ./discrep -[n|p|h] [-rn | -f<name>] [-v] [-sn]\n");
    printf("  -f<name>: read points from the csv file <name>\n");
    printf("        -n: naive (default) method\n");
    printf("        -p: precomputation method\n");
    printf("        -h: halfspace method\n");
    printf("       -rn: generate n points randomly and find the discrepancy\n");
    printf("       -sn: seed the random number generator with n\n");
    printf("        -v: be verbose\n");
    printf("Example: ./discrep -r5\n");
    return 0;
  }
  
  point3d_t* points = NULL;
  int num_points = 0;
  int verbose=0;
  char* filename;
  enum {CSV, RANDOM} mode = RANDOM;
  enum {NAIVE, PRECOMPUTE, HALFSPACE} method = NAIVE;
  int seed = 0;
  
  int current_arg = 1;
  while (current_arg < argc) {
    if (argv[current_arg][1] == 'r') {
      mode = RANDOM;
      num_points = atoi(&argv[1][2]);
    } else if (argv[current_arg][1] == 'f') {
      mode = CSV;
      filename = argv[current_arg] + 2;
    } else if (argv[current_arg][1] == 'p') {
      method = PRECOMPUTE;
    } else if (argv[current_arg][1] == 'h') {
      method = HALFSPACE;
    } else if (argv[current_arg][1] == 's') {
      seed = atoi(&argv[current_arg][2]);
    } else if (argv[current_arg][1] == 'v') {
      if (argv[current_arg][2] == '\0') {
        verbose = 1;
      } else {
        verbose = atoi(&argv[current_arg][2]);
      }
    }
    ++current_arg;
  }
  
  //------------------------------ Get input points --------------------------
  
  if (mode == RANDOM) {
    if (verbose>0) {
      printf("Generating %d random points\n", num_points);
    }
  
    points = (point3d_t*)malloc(num_points*sizeof(point3d_t));
    srandom(seed);
    for (int i=0; i<num_points; ++i) {
      point3d_get_random_unit(points + i);
    }
  
    if (verbose>1) {
      printf("Generated points:\n");
      for (int i=0; i<num_points; ++i) {
        point3d_print(points + i);
        printf("\n");
      }
    }
    
  } else {
    if (verbose>0) {
      printf("Reading CSV file %s\n", filename);
    }
    if (point3d_read_csv(filename, &points, &num_points)) {
      return 1;
    }
    if (verbose>0) {
      printf("Read %d points\n", num_points);
      if (verbose>1) {
        for (int i=0; i<num_points; ++i) {
          printf("%d: ", i);
          point3d_print(points+i);
          printf("\n");
        }
      }
    }
  }
  
  // ------------------------ Compute discrepancy ----------------------------
  
  float discrep;
  scap_t maximal_cap;
  
  if (verbose>0) printf("Finding discrepancy...\n");
  
  if (method == NAIVE) {
   discrepancy(points, num_points, 1.0e-6, NULL, &discrep, &maximal_cap, verbose);
  } else if (method == PRECOMPUTE) {
    scap_containment_precomputation_t SC;
    scap_precompute(points, num_points, &SC, verbose);
    discrepancy(points, num_points, 1.0e-6, &SC, &discrep, &maximal_cap, verbose);
  } else {
    halfspace_discrepancy(points, num_points, 1.0e-16, &discrep, &maximal_cap, verbose);
  }
  
  printf("Discrepancy: %f\n", discrep);
  if (verbose>0) {
    printf("Maximal cap:\n");
    scap_print(&maximal_cap);
  }
  
  return 0;
}















