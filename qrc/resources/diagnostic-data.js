/* QRC course self-check data. Edit this file to change questions or recommendations.
   Everything after "window.QRC_DIAGNOSTIC =" and before the final ";" must stay valid JSON.

   levels[]: one per course. "prev"/"next" link the checks in sequence.
   Course names, prerequisites ("who"), and "covers" follow the Mathematics course descriptions
   (inside.lawrence.edu/academics/college/mathematics/course-descriptions) and the course syllabi:
   MATH 102 W26 (OpenStax Intermediate Algebra 2e), MATH 103 F26 (OpenStax Precalculus 2e),
   MATH 140 S27 (OpenStax Calculus Vol. 1, worksheets A0–E5), and MATH 155 W26 (Heaton; Lang, Calculus of Several Variables).
   "text" names the course textbook; section numbers in "where" refer to it.
   areas[]: skill areas, two questions each. "ready": true marks a prerequisite area (skills a student should bring into the course).
   items[].q and items[].opts are small HTML strings. Write fractions as {{a|b}}. The FIRST option is the correct one; the page shuffles them.
   worksheets[]: QRC's own worksheets. "file" is a link (relative or full URL) once posted; null shows "Ask at the QRC desk".
   further: an optional "Going further" box in the results (intro + items; an item may be {"section": id, "label"} to link a directory topic).
   free[]: free resources. "ref" is an entry id from resources.js, or "url" + "label" for a direct link; "where" says what to open. */
window.QRC_DIAGNOSTIC =
{
  "version": "0.4",
  "updated": "2026-10-11",
  "levels": [
    {
      "id": "102",
      "course": "MATH 102",
      "name": "Foundations in Math",
      "who": "the ALEKS assessment (no minimum score)",
      "covers": "Real numbers, linear equations and inequalities, systems of equations, factoring, polynomials, rational and radical expressions, and exponentials and logarithms.",
      "prev": null,
      "next": "103",
      "areas": [
        {
          "id": "arith",
          "name": "Fractions and order of operations",
          "ready": true,
          "why": "Every later topic, from slopes to derivatives, is built out of fraction arithmetic.",
          "items": [
            {
              "q": "{{3|4}} + {{5|6}} =",
              "opts": [
                "{{19|12}}",
                "{{8|10}}",
                "{{15|24}}",
                "{{4|5}}"
              ],
              "explain": "Use a common denominator of 12: {{9|12}} + {{10|12}} = {{19|12}}."
            },
            {
              "q": "18 − 4(3 − 5) =",
              "opts": [
                "26",
                "10",
                "28",
                "−26"
              ],
              "explain": "Parentheses first: 3 − 5 = −2. Then 4(−2) = −8, and 18 − (−8) = 26."
            }
          ],
          "worksheets": [
            {
              "title": "Fractions, Ratios, and Percentages Guide",
              "file": null
            },
            {
              "title": "Number Properties, Operations, and Structure Guide",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-intalg",
              "where": "Sections 1.1–1.5: integers, fractions, decimals, and properties of real numbers."
            },
            {
              "ref": "openstax-prealgebra",
              "where": "The chapter on fractions, including the section on adding and subtracting with different denominators."
            },
            {
              "ref": "khan",
              "where": "Search \"add fractions with unlike denominators\" and \"order of operations\"; do the practice sets."
            }
          ]
        },
        {
          "id": "percent",
          "name": "Percents and scientific notation",
          "ready": true,
          "why": "Percents show up in every word problem, and scientific notation in every science course.",
          "items": [
            {
              "q": "A $40 shirt is 25% off. What is the sale price?",
              "opts": [
                "$30",
                "$15",
                "$35",
                "$10"
              ],
              "explain": "25% of 40 is 10, so the price drops to 40 − 10 = $30."
            },
            {
              "q": "Write 0.00045 in scientific notation.",
              "opts": [
                "4.5 × 10<sup>−4</sup>",
                "4.5 × 10<sup>4</sup>",
                "4.5 × 10<sup>−3</sup>",
                "45 × 10<sup>4</sup>"
              ],
              "explain": "Move the decimal point 4 places right to get 4.5, so the exponent is −4."
            }
          ],
          "worksheets": [
            {
              "title": "Fractions, Ratios, and Percentages Guide",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-intalg",
              "where": "Section 5.2: properties of exponents and scientific notation."
            },
            {
              "ref": "openstax-prealgebra",
              "where": "The chapter on percents."
            },
            {
              "ref": "khan",
              "where": "Search \"percent word problems\" and \"scientific notation.\""
            }
          ]
        },
        {
          "id": "expr",
          "name": "Simplifying expressions",
          "ready": false,
          "why": "Most errors in later courses are small algebra slips: a dropped negative or a missed term.",
          "items": [
            {
              "q": "Simplify 4(x − 3) − 2(x + 1).",
              "opts": [
                "2x − 14",
                "2x − 10",
                "2x − 13",
                "6x − 14"
              ],
              "explain": "Distribute: 4x − 12 − 2x − 2. Combine: 2x − 14. The −2 multiplies both terms in the second parentheses."
            },
            {
              "q": "Expand (2x − 5)<sup>2</sup>.",
              "opts": [
                "4x<sup>2</sup> − 20x + 25",
                "4x<sup>2</sup> + 25",
                "4x<sup>2</sup> − 10x + 25",
                "2x<sup>2</sup> − 20x + 25"
              ],
              "explain": "(2x − 5)(2x − 5) = 4x<sup>2</sup> − 10x − 10x + 25. Squaring doesn't distribute over subtraction."
            }
          ],
          "worksheets": [
            {
              "title": "Expressions Guide",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-common-errors",
              "where": "The algebra errors page. Most of these slips are on it."
            },
            {
              "ref": "openstax-intalg",
              "where": "Sections 5.1–5.4: adding, subtracting, multiplying, and dividing polynomials."
            }
          ]
        },
        {
          "id": "exp",
          "name": "Exponent rules",
          "ready": false,
          "why": "Exponent rules come back in 103 as exponential functions and in 140 as the power rule.",
          "items": [
            {
              "q": "(2x<sup>3</sup>)<sup>2</sup> =",
              "opts": [
                "4x<sup>6</sup>",
                "2x<sup>6</sup>",
                "4x<sup>5</sup>",
                "2x<sup>9</sup>"
              ],
              "explain": "Square both factors: 2<sup>2</sup> = 4, and (x<sup>3</sup>)<sup>2</sup> = x<sup>6</sup>."
            },
            {
              "q": "Rewrite {{1|x<sup>−3</sup>}} with a positive exponent.",
              "opts": [
                "x<sup>3</sup>",
                "−x<sup>3</sup>",
                "x<sup>−3</sup>",
                "{{1|x<sup>3</sup>}}"
              ],
              "explain": "A negative exponent in the denominator moves to the numerator as a positive exponent."
            }
          ],
          "worksheets": [
            {
              "title": "Expressions Guide",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-intalg",
              "where": "Section 5.2 (properties of exponents) and Section 8.3 (rational exponents)."
            },
            {
              "ref": "pauls-algebra",
              "where": "Preliminaries: integer exponents and rational exponents."
            },
            {
              "ref": "khan",
              "where": "Search \"exponent properties\"; do the practice set."
            }
          ]
        },
        {
          "id": "lineq",
          "name": "Solving linear equations",
          "ready": false,
          "why": "Solving for an unknown is the move behind almost every problem in every quantitative course.",
          "items": [
            {
              "q": "Solve 3(x − 2) = 2x + 4.",
              "opts": [
                "x = 10",
                "x = 2",
                "x = −2",
                "x = 6"
              ],
              "explain": "3x − 6 = 2x + 4, so x = 10. Check: 3(8) = 24 and 2(10) + 4 = 24."
            },
            {
              "q": "Solve {{x|4}} + 3 = 7.",
              "opts": [
                "x = 16",
                "x = 40",
                "x = 1",
                "x = 4"
              ],
              "explain": "Subtract 3 to get {{x|4}} = 4, then multiply by 4."
            }
          ],
          "worksheets": [
            {
              "title": "Equations Guide",
              "file": null
            },
            {
              "title": "Inequalities Guide",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-algebra",
              "where": "Solving Equations and Inequalities: linear equations."
            },
            {
              "ref": "openstax-intalg",
              "where": "Sections 2.1 and 2.3 (solving equations and formulas) and 2.5–2.7 (inequalities)."
            }
          ]
        },
        {
          "id": "lines",
          "name": "Slope and lines",
          "ready": false,
          "why": "Slope is the first idea of calculus: a derivative is a slope.",
          "items": [
            {
              "q": "Which line passes through (0, −3) and (2, 1)?",
              "opts": [
                "y = 2x − 3",
                "y = −3x + 2",
                "y = {{1|2}}x − 3",
                "y = 2x + 1"
              ],
              "explain": "Slope = {{1 − (−3)|2 − 0}} = 2, and the y-intercept is −3."
            },
            {
              "q": "What is the slope of the line through (1, 4) and (3, −2)?",
              "opts": [
                "−3",
                "3",
                "−{{1|3}}",
                "−6"
              ],
              "explain": "Slope = {{−2 − 4|3 − 1}} = {{−6|2}} = −3."
            }
          ],
          "worksheets": [
            {
              "title": "OpenStax Intermediate Algebra excerpts, sections 3.1–3.4",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-intalg",
              "where": "Sections 3.1–3.4: graphing lines, slope, equations of lines, and linear inequalities."
            },
            {
              "ref": "desmos",
              "where": "Graph y = mx + b with sliders for m and b."
            }
          ]
        },
        {
          "id": "sysrad",
          "name": "Systems and radicals",
          "ready": false,
          "why": "Systems of equations and radicals are on the MATH 102 syllabus and come back throughout MATH 103.",
          "items": [
            {
              "q": "Solve the system x + y = 5 and x − y = 1.",
              "opts": [
                "x = 3, y = 2",
                "x = 2, y = 3",
                "x = 4, y = 1",
                "x = 5, y = 0"
              ],
              "explain": "Add the equations: 2x = 6, so x = 3, and then y = 5 − 3 = 2."
            },
            {
              "q": "Simplify √50.",
              "opts": [
                "5√2",
                "25√2",
                "2√5",
                "10√5"
              ],
              "explain": "50 = 25 · 2, and √25 = 5, so √50 = 5√2."
            }
          ],
          "worksheets": [
            {
              "title": "Equations Guide",
              "file": null
            },
            {
              "title": "Radicals problem sheet (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-algebra",
              "where": "Systems of Equations, and Preliminaries: radicals."
            },
            {
              "ref": "openstax-intalg",
              "where": "Sections 4.1–4.2 (systems of linear equations) and 8.1–8.2 (simplifying roots)."
            }
          ]
        },
        {
          "id": "factor",
          "name": "Factoring",
          "ready": false,
          "why": "Factoring is how you solve quadratics in 103 and simplify limits in 140.",
          "items": [
            {
              "q": "Factor x<sup>2</sup> + 7x + 10.",
              "opts": [
                "(x + 2)(x + 5)",
                "(x + 10)(x + 1)",
                "(x − 2)(x − 5)",
                "(x + 3)(x + 4)"
              ],
              "explain": "Find two numbers that multiply to 10 and add to 7: 2 and 5."
            },
            {
              "q": "Factor x<sup>2</sup> − 9.",
              "opts": [
                "(x − 3)(x + 3)",
                "(x − 3)<sup>2</sup>",
                "(x − 9)(x + 1)",
                "It doesn't factor."
              ],
              "explain": "A difference of squares: a<sup>2</sup> − b<sup>2</sup> = (a − b)(a + b)."
            }
          ],
          "worksheets": [
            {
              "title": "Factoring Guide",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-intalg",
              "where": "Sections 6.1–6.5: GCF and grouping, trinomials, special forms, and a general strategy."
            },
            {
              "ref": "pauls-algebra",
              "where": "Preliminaries: factoring polynomials."
            },
            {
              "ref": "khan",
              "where": "Search \"factoring quadratics\"; do the practice set."
            }
          ]
        },
        {
          "id": "word",
          "name": "Word problems",
          "ready": false,
          "why": "Turning a situation into an equation is what the Q requirement is really about.",
          "items": [
            {
              "q": "A gym charges a $25 sign-up fee plus $15 a month. What is the total after 8 months?",
              "opts": [
                "$145",
                "$200",
                "$120",
                "$160"
              ],
              "explain": "25 + 15(8) = 25 + 120 = $145."
            },
            {
              "q": "For the same gym, which equation gives the total cost C after m months?",
              "opts": [
                "C = 15m + 25",
                "C = 25m + 15",
                "C = 40m",
                "C = 15(m + 25)"
              ],
              "explain": "The $25 is paid once; the $15 is paid each month."
            }
          ],
          "worksheets": [
            {
              "title": "Basic Word Problem Guide",
              "file": null
            }
          ],
          "free": [
            {
              "guide": "stuck",
              "where": "Use the 10-minute routine: write what's asked, list what you know, find the stuck step."
            },
            {
              "ref": "openstax-intalg",
              "where": "Sections 2.2 and 2.4: word problems and applications."
            }
          ]
        }
      ],
      "text": "OpenStax Intermediate Algebra 2e",
      "further": {
        "intro": "Ready for more? These preview MATH 103.",
        "items": [
          {
            "section": "precalc",
            "label": "Precalculus topic page"
          },
          {
            "ref": "pauls-algebra",
            "where": "The Graphing and Functions chapter, a preview of MATH 103."
          }
        ]
      }
    },
    {
      "id": "103",
      "course": "MATH 103",
      "name": "Preparation for Calculus",
      "who": "ALEKS score of 45 or more, or C− or better in MATH 102 at Lawrence",
      "covers": "Polynomial, rational, exponential, logarithmic, and trigonometric functions, in preparation for calculus.",
      "prev": "102",
      "next": "140",
      "areas": [
        {
          "id": "alg",
          "name": "Algebra toolkit",
          "ready": true,
          "why": "MATH 103 assumes you can solve quadratics and simplify fractions with variables.",
          "items": [
            {
              "q": "Solve x<sup>2</sup> − 5x + 6 = 0.",
              "opts": [
                "x = 2 or x = 3",
                "x = −2 or x = −3",
                "x = 1 or x = 6",
                "x = 5 or x = 6"
              ],
              "explain": "Factor: (x − 2)(x − 3) = 0."
            },
            {
              "q": "Simplify {{x<sup>2</sup> − 4|x − 2}} (for x ≠ 2).",
              "opts": [
                "x + 2",
                "x − 2",
                "x<sup>2</sup> − 2",
                "−2"
              ],
              "explain": "x<sup>2</sup> − 4 = (x − 2)(x + 2); cancel the common factor x − 2."
            }
          ],
          "worksheets": [
            {
              "title": "Factoring Guide",
              "file": null
            },
            {
              "title": "Quadratics problem sheet (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-collegealg",
              "where": "Chapter 1, Prerequisites, and Chapter 2 on quadratic equations: the algebra MATH 103 assumes."
            },
            {
              "ref": "pauls-algebra",
              "where": "Solving Equations and Inequalities: quadratic equations, and Preliminaries: rational expressions."
            },
            {
              "ref": "pauls-common-errors",
              "where": "The algebra errors page."
            }
          ]
        },
        {
          "id": "func",
          "name": "Function notation and composition",
          "ready": false,
          "why": "Every topic in calculus is about functions, so the notation has to be automatic.",
          "items": [
            {
              "q": "If f(x) = x<sup>2</sup> − 3x, what is f(−2)?",
              "opts": [
                "10",
                "−2",
                "4",
                "−10"
              ],
              "explain": "(−2)<sup>2</sup> − 3(−2) = 4 + 6 = 10. Use parentheses when you substitute a negative."
            },
            {
              "q": "If f(x) = 2x + 1 and g(x) = x<sup>2</sup>, what is f(g(3))?",
              "opts": [
                "19",
                "49",
                "13",
                "7"
              ],
              "explain": "Inside first: g(3) = 9. Then f(9) = 2(9) + 1 = 19."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "ref": "openstax-precalc",
              "where": "Sections 1.1 and 1.4: functions, function notation, and composition."
            },
            {
              "ref": "pauls-algebra",
              "where": "Graphing and Functions: function notation and combining functions."
            }
          ]
        },
        {
          "id": "graph",
          "name": "Graphs, domain, and transformations",
          "ready": false,
          "why": "Reading a function from its graph, and the reverse, is how calculus ideas are pictured.",
          "items": [
            {
              "q": "The graph of y = (x − 2)<sup>2</sup> + 3 is the graph of y = x<sup>2</sup> shifted…",
              "opts": [
                "right 2 and up 3",
                "left 2 and up 3",
                "right 2 and down 3",
                "left 3 and up 2"
              ],
              "explain": "Replacing x with x − 2 shifts right 2; adding 3 shifts up 3."
            },
            {
              "q": "What is the domain of f(x) = √(x − 4)?",
              "opts": [
                "x ≥ 4",
                "x > 4",
                "all real numbers",
                "x ≥ −4"
              ],
              "explain": "The expression under the square root must be at least 0: x − 4 ≥ 0."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 103 problem sheets: functions and transformations",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "desmos",
              "where": "Graph y = (x − h)<sup>2</sup> + k with sliders for h and k."
            },
            {
              "ref": "openstax-precalc",
              "where": "Sections 1.2 (domain and range) and 1.5 (transformations of functions)."
            }
          ]
        },
        {
          "id": "inv",
          "name": "Inverse functions",
          "ready": false,
          "why": "Inverses are how logarithms and inverse trig functions are defined.",
          "items": [
            {
              "q": "What is the inverse of f(x) = 3x − 6?",
              "opts": [
                "f<sup>−1</sup>(x) = {{x + 6|3}}",
                "f<sup>−1</sup>(x) = {{1|3x − 6}}",
                "f<sup>−1</sup>(x) = 3x + 6",
                "f<sup>−1</sup>(x) = {{x|3}} − 6"
              ],
              "explain": "Swap x and y and solve: x = 3y − 6, so y = {{x + 6|3}}. Note f<sup>−1</sup> doesn't mean 1/f."
            },
            {
              "q": "If f(2) = 7, what is f<sup>−1</sup>(7)?",
              "opts": [
                "2",
                "7",
                "{{1|7}}",
                "You can't tell."
              ],
              "explain": "An inverse undoes f: if f sends 2 to 7, then f<sup>−1</sup> sends 7 back to 2."
            }
          ],
          "worksheets": [
            {
              "title": "Inverse Functions notes (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-precalc",
              "where": "Sections 1.7 (inverse functions) and 3.8 (inverses and radical functions)."
            },
            {
              "ref": "pauls-algebra",
              "where": "Graphing and Functions: inverse functions."
            }
          ]
        },
        {
          "id": "poly",
          "name": "Polynomial and rational functions",
          "ready": false,
          "why": "Zeros and asymptotes describe the shape of a graph before you draw it.",
          "items": [
            {
              "q": "What are the zeros of f(x) = x(x − 1)(x + 4)?",
              "opts": [
                "0, 1, and −4",
                "0, −1, and 4",
                "1 and −4 only",
                "0 and 4 only"
              ],
              "explain": "A product is zero when one factor is zero: x = 0, x = 1, or x = −4."
            },
            {
              "q": "Where is the vertical asymptote of f(x) = {{x + 1|x − 3}}?",
              "opts": [
                "x = 3",
                "x = −1",
                "y = 1",
                "x = −3"
              ],
              "explain": "The denominator is zero at x = 3, and the numerator isn't zero there."
            }
          ],
          "worksheets": [
            {
              "title": "Polynomials problem sheet (MATH 103)",
              "file": null
            },
            {
              "title": "Rational Functions problem sheet (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-precalc",
              "where": "Sections 3.2–3.7: quadratics, polynomial graphs, dividing polynomials, zeros, and rational functions."
            },
            {
              "ref": "desmos",
              "where": "Graph the function and look for where it crosses zero or blows up."
            }
          ]
        },
        {
          "id": "explog",
          "name": "Exponentials and logarithms",
          "ready": false,
          "why": "Exponential growth and its inverse, the logarithm, run through the sciences and economics.",
          "items": [
            {
              "q": "log<sub>2</sub> 8 =",
              "opts": [
                "3",
                "4",
                "{{1|3}}",
                "16"
              ],
              "explain": "log<sub>2</sub> 8 asks: 2 to what power is 8? 2<sup>3</sup> = 8."
            },
            {
              "q": "Solve 3<sup>x</sup> = 20.",
              "opts": [
                "x = {{ln 20|ln 3}}",
                "x = {{20|3}}",
                "x = ln{{20|3}}",
                "x = {{ln 3|ln 20}}"
              ],
              "explain": "Take ln of both sides: x ln 3 = ln 20, so x = {{ln 20|ln 3}} ≈ 2.73."
            }
          ],
          "worksheets": [
            {
              "title": "Exponential and Logarithm Exercises (MATH 103)",
              "file": null
            },
            {
              "title": "Exponential and Logarithm Equations problem sheet (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-precalc",
              "where": "Sections 4.1, 4.3, 4.5–4.7: exponential and logarithmic functions, log properties, equations, and models."
            },
            {
              "ref": "pauls-algebra",
              "where": "Exponential and Logarithm Functions: the whole chapter, especially solving equations."
            }
          ]
        },
        {
          "id": "trig",
          "name": "The unit circle and radians",
          "ready": false,
          "why": "Calculus works in radians, and the unit-circle values come up constantly.",
          "items": [
            {
              "q": "sin({{π|6}}) =",
              "opts": [
                "{{1|2}}",
                "{{√3|2}}",
                "{{√2|2}}",
                "1"
              ],
              "explain": "{{π|6}} is 30°, and sin 30° = {{1|2}}."
            },
            {
              "q": "What is 150° in radians?",
              "opts": [
                "{{5π|6}}",
                "{{5π|3}}",
                "{{3π|4}}",
                "{{2π|3}}"
              ],
              "explain": "Multiply by {{π|180}}: 150 · {{π|180}} = {{5π|6}}."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 103 problem sheets: unit circle and right-triangle trig",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-precalc",
              "where": "Sections 5.1–5.4: angles, the unit circle, other trig functions, and right-triangle trigonometry."
            },
            {
              "ref": "pauls-algtrig-review",
              "where": "The trig section: unit circle and trig function values."
            }
          ]
        },
        {
          "id": "trigeq",
          "name": "Trig identities and equations",
          "ready": false,
          "why": "Identities let you rewrite a hard expression as an easy one, a move you'll use in integration.",
          "items": [
            {
              "q": "Solve sin x = {{1|2}} for 0 ≤ x < 2π.",
              "opts": [
                "x = {{π|6}} or {{5π|6}}",
                "x = {{π|6}} or {{7π|6}}",
                "x = {{π|3}} or {{2π|3}}",
                "x = {{π|6}} only"
              ],
              "explain": "Sine is positive in quadrants I and II, so x = {{π|6}} and π − {{π|6}} = {{5π|6}}."
            },
            {
              "q": "Which equation is true for every angle θ?",
              "opts": [
                "sin<sup>2</sup>θ + cos<sup>2</sup>θ = 1",
                "sin θ + cos θ = 1",
                "tan θ = {{cos θ|sin θ}}",
                "sin(2θ) = 2 + sin θ"
              ],
              "explain": "The Pythagorean identity comes from x<sup>2</sup> + y<sup>2</sup> = 1 on the unit circle."
            }
          ],
          "worksheets": [
            {
              "title": "Trig Equations Exercises (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "openstax-precalc",
              "where": "Sections 7.1, 7.3, and 7.5: identities, double-angle formulas, and solving trig equations."
            },
            {
              "ref": "pauls-algtrig-review",
              "where": "The trig section: identities and solving trig equations."
            }
          ]
        }
      ],
      "text": "OpenStax Precalculus 2e",
      "further": {
        "intro": "MATH 103 moves quickly through trigonometry and doesn't cover much geometry. To go further:",
        "items": [
          {
            "section": "geometry",
            "label": "Geometry and further trig topic page"
          },
          {
            "ref": "corral-trig",
            "where": "General triangles, the laws of sines and cosines, and more identities."
          },
          {
            "ref": "openstax-precalc",
            "where": "Chapters 8 (further applications of trigonometry: polar coordinates and vectors) and 10 (analytic geometry: conics)."
          },
          {
            "ref": "euclid-joyce",
            "where": "Book I, for plane geometry with proofs."
          }
        ]
      }
    },
    {
      "id": "140",
      "course": "MATH 140",
      "name": "Calculus",
      "who": "ALEKS score of 75 or more, or C− or better in MATH 103 at Lawrence",
      "covers": "Functions, limits, derivatives, the Mean Value Theorem, integrals, and the Fundamental Theorem of Calculus, with applications such as related rates, curve sketching, and optimization. Substitution comes at the end if there's time.",
      "prev": "103",
      "next": "155",
      "areas": [
        {
          "id": "pre-alg",
          "name": "Algebra and exponentials (precalculus)",
          "ready": true,
          "why": "Weak algebra is the most common reason calculus feels hard.",
          "items": [
            {
              "q": "Simplify {{1|x}} − {{1|x + h}}.",
              "opts": [
                "{{h|x(x + h)}}",
                "{{−h|x(x + h)}}",
                "{{1|h}}",
                "0"
              ],
              "explain": "Common denominator: {{(x + h) − x|x(x + h)}} = {{h|x(x + h)}}. You'll do exactly this when computing derivatives from the definition."
            },
            {
              "q": "Solve e<sup>2x</sup> = 5.",
              "opts": [
                "x = {{1|2}} ln 5",
                "x = ln{{5|2}}",
                "x = {{5|2e}}",
                "x = ln 5 − 2"
              ],
              "explain": "Take ln: 2x = ln 5, so x = {{ln 5|2}}."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 review worksheets A1–A3",
              "file": null
            },
            {
              "title": "Exponential and Logarithm Exercises (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-algtrig-review",
              "where": "The algebra section: work one topic a day."
            },
            {
              "ref": "pauls-common-errors",
              "where": "The algebra and calculus errors pages."
            }
          ]
        },
        {
          "id": "pre-trig",
          "name": "Trigonometry (precalculus)",
          "ready": true,
          "why": "Trig functions are some of the most common functions you'll differentiate and integrate.",
          "items": [
            {
              "q": "cos({{π|3}}) =",
              "opts": [
                "{{1|2}}",
                "{{√3|2}}",
                "{{√2|2}}",
                "0"
              ],
              "explain": "{{π|3}} is 60°, and cos 60° = {{1|2}}."
            },
            {
              "q": "tan({{π|4}}) =",
              "opts": [
                "1",
                "0",
                "√3",
                "undefined"
              ],
              "explain": "At 45°, sine and cosine are equal, so their ratio is 1."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 review worksheets A1–A3",
              "file": null
            },
            {
              "title": "Trig Equations Exercises (MATH 103)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-algtrig-review",
              "where": "The trig section: unit circle values."
            },
            {
              "ref": "openstax-precalc",
              "where": "Chapter 5: the unit circle."
            }
          ]
        },
        {
          "id": "limits",
          "name": "Limits",
          "ready": false,
          "why": "Limits are the definition behind both derivatives and integrals.",
          "items": [
            {
              "q": "lim<sub>x→3</sub> {{x<sup>2</sup> − 9|x − 3}} =",
              "opts": [
                "6",
                "0",
                "It doesn't exist.",
                "3"
              ],
              "explain": "Factor and cancel: {{(x − 3)(x + 3)|x − 3}} = x + 3, which approaches 6."
            },
            {
              "q": "lim<sub>x→∞</sub> {{3x<sup>2</sup> + 1|x<sup>2</sup> − 5}} =",
              "opts": [
                "3",
                "∞",
                "0",
                "−{{1|5}}"
              ],
              "explain": "Divide top and bottom by x<sup>2</sup>; the leading coefficients give {{3|1}} = 3."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 worksheets B1–B4 (limits and continuity) and D6 (limits at infinity)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Limits, especially computing limits and limits at infinity."
            },
            {
              "ref": "openstax-calc",
              "where": "Sections 2.2–2.4 (limits, limit laws, continuity) and 4.6 (limits at infinity)."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-1 problem book, chapter 1 (limits), with full solutions."
            }
          ]
        },
        {
          "id": "rules",
          "name": "Derivative rules",
          "ready": false,
          "why": "The power, product, and quotient rules let you differentiate without going back to limits.",
          "items": [
            {
              "q": "{{d|dx}}[x<sup>3</sup> − 4x] =",
              "opts": [
                "3x<sup>2</sup> − 4",
                "3x<sup>2</sup> − 4x",
                "x<sup>2</sup> − 4",
                "3x<sup>3</sup> − 4"
              ],
              "explain": "Power rule term by term: 3x<sup>2</sup> and −4."
            },
            {
              "q": "{{d|dx}}[x<sup>2</sup> sin x] =",
              "opts": [
                "2x sin x + x<sup>2</sup> cos x",
                "2x cos x",
                "2x sin x − x<sup>2</sup> cos x",
                "x<sup>2</sup> cos x"
              ],
              "explain": "Product rule: (first)′(second) + (first)(second)′."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 worksheets B5–B6, C1, and C3 (the derivative and differentiation rules)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Derivatives, the product and quotient rules."
            },
            {
              "ref": "openstax-calc",
              "where": "Sections 3.1–3.3 and 3.5: defining the derivative, differentiation rules, and trig derivatives."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-1 problem book, chapter 2."
            }
          ]
        },
        {
          "id": "chain",
          "name": "The chain rule",
          "ready": false,
          "why": "The chain rule handles functions inside functions, and it's the most-missed derivative rule.",
          "items": [
            {
              "q": "{{d|dx}}(3x + 1)<sup>5</sup> =",
              "opts": [
                "15(3x + 1)<sup>4</sup>",
                "5(3x + 1)<sup>4</sup>",
                "15(3x + 1)<sup>5</sup>",
                "(3x + 1)<sup>4</sup>"
              ],
              "explain": "Outside derivative 5(3x + 1)<sup>4</sup>, times the inside derivative 3."
            },
            {
              "q": "{{d|dx}} e<sup>x<sup>2</sup></sup> =",
              "opts": [
                "2x e<sup>x<sup>2</sup></sup>",
                "e<sup>x<sup>2</sup></sup>",
                "x<sup>2</sup> e<sup>x<sup>2</sup> − 1</sup>",
                "2e<sup>x<sup>2</sup></sup>"
              ],
              "explain": "e<sup>u</sup> differentiates to e<sup>u</sup>, times u′ = 2x."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 worksheets C4–C7 (chain rule, implicit differentiation, inverse, exp, and log derivatives)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Derivatives, the chain rule."
            },
            {
              "ref": "openstax-calc",
              "where": "Sections 3.6–3.9: chain rule, inverse functions, implicit differentiation, exponentials and logs."
            },
            {
              "ref": "3b1b-calculus",
              "where": "The video on the chain and product rules."
            }
          ]
        },
        {
          "id": "apps",
          "name": "Using derivatives",
          "ready": false,
          "why": "Tangent lines, rates, and maximums and minimums are what derivatives are for.",
          "items": [
            {
              "q": "Where are the critical points of f(x) = x<sup>3</sup> − 3x?",
              "opts": [
                "x = 1 and x = −1",
                "x = 0 only",
                "x = √3 and x = −√3",
                "x = 3"
              ],
              "explain": "f′(x) = 3x<sup>2</sup> − 3 = 0 gives x<sup>2</sup> = 1."
            },
            {
              "q": "What is the tangent line to y = x<sup>2</sup> at x = 3?",
              "opts": [
                "y = 6x − 9",
                "y = 6x + 9",
                "y = 2x + 3",
                "y = 6x − 3"
              ],
              "explain": "The point is (3, 9) and the slope is 2(3) = 6, so y − 9 = 6(x − 3)."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 worksheets C8 and D1–D8 (related rates through optimization)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Applications of Derivatives, critical points and finding absolute extrema."
            },
            {
              "ref": "openstax-calc",
              "where": "Sections 4.1–4.7: related rates, linear approximation, extrema, the Mean Value Theorem, curve sketching, and optimization."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-1 problem book, chapter 3."
            }
          ]
        },
        {
          "id": "ftc",
          "name": "Integrals and the Fundamental Theorem",
          "ready": false,
          "why": "The Fundamental Theorem connects the two halves of calculus.",
          "items": [
            {
              "q": "∫<sub>0</sub><sup>2</sup> 3x<sup>2</sup> dx =",
              "opts": [
                "8",
                "12",
                "6",
                "24"
              ],
              "explain": "An antiderivative is x<sup>3</sup>; evaluate 2<sup>3</sup> − 0<sup>3</sup> = 8."
            },
            {
              "q": "{{d|dx}} ∫<sub>1</sub><sup>x</sup> √(t<sup>2</sup> + 1) dt =",
              "opts": [
                "√(x<sup>2</sup> + 1)",
                "√(x<sup>2</sup> + 1) − √2",
                "2x√(x<sup>2</sup> + 1)",
                "{{x|√(x<sup>2</sup> + 1)}}"
              ],
              "explain": "The first part of the Fundamental Theorem: differentiating the accumulation gives back the integrand at x."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 worksheets E2–E5 (area, the definite integral, the Fundamental Theorem)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Integrals, especially the Fundamental Theorem of Calculus."
            },
            {
              "ref": "openstax-calc",
              "where": "Sections 5.1–5.3: approximating area, the definite integral, and the Fundamental Theorem."
            },
            {
              "ref": "3b1b-calculus",
              "where": "The videos on integration and the Fundamental Theorem."
            }
          ]
        },
        {
          "id": "usub",
          "name": "Antiderivatives and substitution",
          "ready": false,
          "why": "Substitution is the chain rule run backward, and it's where MATH 155 begins.",
          "items": [
            {
              "q": "∫ 2x(x<sup>2</sup> + 1)<sup>3</sup> dx =",
              "opts": [
                "{{(x<sup>2</sup> + 1)<sup>4</sup>|4}} + C",
                "(x<sup>2</sup> + 1)<sup>4</sup> + C",
                "{{x<sup>2</sup>(x<sup>2</sup> + 1)<sup>4</sup>|4}} + C",
                "2(x<sup>2</sup> + 1)<sup>4</sup> + C"
              ],
              "explain": "Let u = x<sup>2</sup> + 1, so du = 2x dx and the integral becomes ∫u<sup>3</sup> du = {{u<sup>4</sup>|4}} + C."
            },
            {
              "q": "∫ cos x dx =",
              "opts": [
                "sin x + C",
                "−sin x + C",
                "−cos x + C",
                "{{cos<sup>2</sup>x|2}} + C"
              ],
              "explain": "The derivative of sin x is cos x."
            }
          ],
          "worksheets": [
            {
              "title": "MATH 140 worksheet E1 (antiderivatives)",
              "file": null
            }
          ],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Integrals, the substitution rule."
            },
            {
              "ref": "openstax-calc",
              "where": "Section 4.10 (antiderivatives) and 5.5 (substitution). MATH 140 reaches substitution only if there's time."
            }
          ]
        }
      ],
      "text": "OpenStax Calculus, Volume 1",
      "further": {
        "intro": "MATH 140 ends at the Fundamental Theorem, with substitution if there's time. To go further:",
        "items": [
          {
            "ref": "pauls-calc",
            "where": "Calculus I: the substitution rule, then Calculus II: integration techniques."
          },
          {
            "url": "https://openstax.org/details/books/calculus-volume-2",
            "label": "OpenStax Calculus, Volume 2",
            "where": "Chapters 1 and 3: substitution and integration techniques, where MATH 155 starts."
          },
          {
            "section": "calcds",
            "label": "Calculus for data science topic page"
          }
        ]
      }
    },
    {
      "id": "155",
      "course": "MATH 155",
      "name": "Multivariable Calculus",
      "who": "MATH 140, or a suitable AP or IB score, plus the department's minimum ALEKS score",
      "covers": "Vectors and geometry in space, curves and vector-valued functions, partial derivatives, gradients, and the multivariable chain rule; a review of substitution and integration by parts; then potential functions, line integrals, and double integrals.",
      "prev": "140",
      "next": null,
      "areas": [
        {
          "id": "dready",
          "name": "Derivatives (Calculus I)",
          "ready": true,
          "why": "Every technique in this course leans on fast, accurate differentiation.",
          "items": [
            {
              "q": "{{d|dx}} ln(x<sup>2</sup> + 1) =",
              "opts": [
                "{{2x|x<sup>2</sup> + 1}}",
                "{{1|x<sup>2</sup> + 1}}",
                "{{2x|x}}",
                "2x ln(x<sup>2</sup> + 1)"
              ],
              "explain": "ln u differentiates to {{u′|u}}, with u′ = 2x."
            },
            {
              "q": "{{d|dx}} sin(3x) =",
              "opts": [
                "3 cos(3x)",
                "cos(3x)",
                "−3 cos(3x)",
                "3 sin(3x)"
              ],
              "explain": "Chain rule: cos(3x) times the inside derivative 3."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Derivatives."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-1 problem book, chapter 2."
            }
          ]
        },
        {
          "id": "iready",
          "name": "Integrals and the Fundamental Theorem (Calculus I)",
          "ready": true,
          "why": "Definite integrals and the Fundamental Theorem are the starting line for this course.",
          "items": [
            {
              "q": "∫<sub>1</sub><sup>e</sup> {{1|x}} dx =",
              "opts": [
                "1",
                "e",
                "0",
                "e − 1"
              ],
              "explain": "An antiderivative is ln x; ln e − ln 1 = 1 − 0 = 1."
            },
            {
              "q": "If F′(x) = f(x), then ∫<sub>a</sub><sup>b</sup> f(x) dx =",
              "opts": [
                "F(b) − F(a)",
                "f(b) − f(a)",
                "F(a) − F(b)",
                "F′(b) − F′(a)"
              ],
              "explain": "This is the second part of the Fundamental Theorem of Calculus."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Integrals."
            },
            {
              "ref": "openstax-calc",
              "where": "Volume 1, Chapter 5, Integration."
            }
          ]
        },
        {
          "id": "sub",
          "name": "Substitution",
          "ready": false,
          "why": "Substitution is the first integration technique and the one you'll use most.",
          "items": [
            {
              "q": "∫ x e<sup>x<sup>2</sup></sup> dx =",
              "opts": [
                "{{1|2}} e<sup>x<sup>2</sup></sup> + C",
                "e<sup>x<sup>2</sup></sup> + C",
                "2e<sup>x<sup>2</sup></sup> + C",
                "{{x<sup>2</sup>|2}} e<sup>x<sup>2</sup></sup> + C"
              ],
              "explain": "Let u = x<sup>2</sup>, du = 2x dx: {{1|2}}∫e<sup>u</sup> du."
            },
            {
              "q": "∫<sub>0</sub><sup>π/2</sup> sin x cos x dx =",
              "opts": [
                "{{1|2}}",
                "1",
                "0",
                "{{π|4}}"
              ],
              "explain": "Let u = sin x; the limits become 0 and 1, and ∫<sub>0</sub><sup>1</sup> u du = {{1|2}}."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus I: Integrals, the substitution rule (and the definite-integral version)."
            },
            {
              "url": "https://openstax.org/details/books/calculus-volume-2",
              "label": "OpenStax Calculus, Volume 2",
              "where": "Chapter 1, Integration, section on substitution."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-2 problem book, the substitution section."
            }
          ]
        },
        {
          "id": "parts",
          "name": "Integration by parts",
          "ready": false,
          "why": "Integration by parts is the product rule run backward.",
          "items": [
            {
              "q": "∫ x e<sup>x</sup> dx =",
              "opts": [
                "(x − 1)e<sup>x</sup> + C",
                "x e<sup>x</sup> + C",
                "{{1|2}}x<sup>2</sup> e<sup>x</sup> + C",
                "(x + 1)e<sup>x</sup> + C"
              ],
              "explain": "u = x, dv = e<sup>x</sup> dx: x e<sup>x</sup> − ∫ e<sup>x</sup> dx."
            },
            {
              "q": "∫ ln x dx =",
              "opts": [
                "x ln x − x + C",
                "{{1|x}} + C",
                "x ln x + C",
                "{{(ln x)<sup>2</sup>|2}} + C"
              ],
              "explain": "u = ln x, dv = dx: x ln x − ∫ x · {{1|x}} dx."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "ref": "pauls-calc",
              "where": "Calculus II: Integration Techniques, integration by parts."
            },
            {
              "url": "https://openstax.org/details/books/calculus-volume-2",
              "label": "OpenStax Calculus, Volume 2",
              "where": "Chapter 3, Techniques of Integration, section 3.1."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-2 problem book, the integration by parts section."
            }
          ]
        },
        {
          "id": "vec",
          "name": "Vectors",
          "ready": false,
          "why": "Vectors are the language of multivariable calculus.",
          "items": [
            {
              "q": "⟨1, 2, −1⟩ · ⟨3, 0, 4⟩ =",
              "opts": [
                "−1",
                "7",
                "⟨3, 0, −4⟩",
                "0"
              ],
              "explain": "Multiply matching components and add: 3 + 0 − 4 = −1."
            },
            {
              "q": "What is the length of ⟨2, −1, 2⟩?",
              "opts": [
                "3",
                "5",
                "√5",
                "9"
              ],
              "explain": "√(4 + 1 + 4) = √9 = 3."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "url": "https://openstax.org/details/books/calculus-volume-3",
              "label": "OpenStax Calculus, Volume 3",
              "where": "Chapter 2, Vectors in Space."
            },
            {
              "ref": "pauls-calc",
              "where": "Calculus III (linked from the menu): 3-dimensional space and vectors."
            },
            {
              "ref": "3b1b-la",
              "where": "The first videos, on vectors and linear combinations."
            }
          ]
        },
        {
          "id": "curves",
          "name": "Curves and vector-valued functions",
          "ready": false,
          "why": "Curves in space carry velocity, acceleration, and arc length, and they are the paths for line integrals.",
          "items": [
            {
              "q": "If r(t) = ⟨t<sup>2</sup>, 3t⟩, what is the velocity vector at t = 1?",
              "opts": [
                "⟨2, 3⟩",
                "⟨1, 3⟩",
                "⟨2t, 3⟩",
                "⟨2, 0⟩"
              ],
              "explain": "Differentiate each component: r′(t) = ⟨2t, 3⟩, so r′(1) = ⟨2, 3⟩."
            },
            {
              "q": "What is the length of the curve r(t) = ⟨3 cos t, 3 sin t⟩ for 0 ≤ t ≤ 2π?",
              "opts": [
                "6π",
                "3π",
                "9π",
                "2π"
              ],
              "explain": "It's a circle of radius 3 traced once; the speed is |r′(t)| = 3, and 3 · 2π = 6π."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "url": "https://openstax.org/details/books/calculus-volume-3",
              "label": "OpenStax Calculus, Volume 3",
              "where": "Chapter 3, Vector-Valued Functions: derivatives and arc length."
            },
            {
              "ref": "pauls-calc",
              "where": "Calculus III: vector functions, their derivatives, and arc length."
            }
          ]
        },
        {
          "id": "partial",
          "name": "Partial derivatives, the gradient, and the chain rule",
          "ready": false,
          "why": "Partial derivatives measure change in one direction at a time.",
          "items": [
            {
              "q": "If f(x, y) = x<sup>2</sup>y + 3y, then {{∂f|∂x}} =",
              "opts": [
                "2xy",
                "2xy + 3",
                "x<sup>2</sup> + 3",
                "2x"
              ],
              "explain": "Treat y as a constant: the derivative of x<sup>2</sup>y is 2xy, and 3y is constant."
            },
            {
              "q": "What is the gradient of f(x, y) = x<sup>2</sup> + y<sup>2</sup> at (1, 2)?",
              "opts": [
                "⟨2, 4⟩",
                "⟨1, 2⟩",
                "5",
                "⟨2x, 2y⟩"
              ],
              "explain": "∇f = ⟨2x, 2y⟩; at (1, 2) that's ⟨2, 4⟩."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "url": "https://openstax.org/details/books/calculus-volume-3",
              "label": "OpenStax Calculus, Volume 3",
              "where": "Chapter 4: partial derivatives, the chain rule, directional derivatives and the gradient, and maxima and minima."
            },
            {
              "ref": "pauls-calc",
              "where": "Calculus III: partial derivatives."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-3 problem book, partial derivatives."
            }
          ]
        },
        {
          "id": "multi",
          "name": "Multiple integrals",
          "ready": false,
          "why": "Double integrals add up a quantity over a region instead of an interval.",
          "items": [
            {
              "q": "∫<sub>0</sub><sup>1</sup> ∫<sub>0</sub><sup>2</sup> xy dy dx =",
              "opts": [
                "1",
                "2",
                "{{1|2}}",
                "4"
              ],
              "explain": "Inside: ∫<sub>0</sub><sup>2</sup> xy dy = 2x. Outside: ∫<sub>0</sub><sup>1</sup> 2x dx = 1."
            },
            {
              "q": "In polar coordinates, the area element dA is",
              "opts": [
                "r dr dθ",
                "dr dθ",
                "r<sup>2</sup> dr dθ",
                "sin θ dr dθ"
              ],
              "explain": "A small polar patch is about r dθ wide and dr deep."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "url": "https://openstax.org/details/books/calculus-volume-3",
              "label": "OpenStax Calculus, Volume 3",
              "where": "Chapter 5, Multiple Integration: double integrals over rectangles and general regions, and in polar coordinates."
            },
            {
              "ref": "pauls-calc",
              "where": "Calculus III: multiple integrals."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-3 problem book, multiple integrals."
            }
          ]
        },
        {
          "id": "green",
          "name": "Potential functions, line integrals, and Green's theorem",
          "ready": false,
          "why": "Line integrals measure work along a path; a potential function makes many of them easy, and Green's theorem connects them to double integrals.",
          "items": [
            {
              "q": "F = ∇f with f(x, y) = x<sup>2</sup>y. What is ∫<sub>C</sub> F · dr along any path C from (0, 0) to (1, 2)?",
              "opts": [
                "2",
                "0",
                "1",
                "It depends on the path."
              ],
              "explain": "For a gradient field, the line integral is f(end) − f(start) = 1<sup>2</sup> · 2 − 0 = 2, whatever the path."
            },
            {
              "q": "For C the unit circle traversed counterclockwise, ∮<sub>C</sub> (−y dx + x dy) =",
              "opts": [
                "2π",
                "π",
                "0",
                "4π"
              ],
              "explain": "By Green's theorem this is ∬ 2 dA = 2 · (area of the unit disk) = 2π."
            }
          ],
          "worksheets": [],
          "free": [
            {
              "url": "https://openstax.org/details/books/calculus-volume-3",
              "label": "OpenStax Calculus, Volume 3",
              "where": "Chapter 6, Vector Calculus: vector fields, line integrals, conservative fields, and Green's theorem."
            },
            {
              "ref": "pauls-calc",
              "where": "Calculus III: line integrals, the fundamental theorem for line integrals, and Green's theorem."
            },
            {
              "ref": "clp-calculus",
              "where": "CLP-4 (vector calculus)."
            }
          ]
        }
      ],
      "text": null,
      "further": {
        "intro": "MATH 155 stops at line integrals and double integrals, and the course doesn't cover matrix algebra. To go further:",
        "items": [
          {
            "section": "multivar",
            "label": "Multivariable and vector calculus topic page"
          },
          {
            "url": "https://openstax.org/details/books/calculus-volume-3",
            "label": "OpenStax Calculus, Volume 3",
            "where": "Chapter 6: conservative fields and path independence, Green's theorem, curl and divergence, surface integrals, Stokes' theorem, and the divergence theorem."
          },
          {
            "ref": "pauls-calc3",
            "where": "Line integrals, surface integrals, Stokes' theorem, and the divergence theorem."
          },
          {
            "ref": "khan-multivar",
            "where": "The videos on divergence, curl, Green's theorem, Stokes' theorem, and the divergence theorem."
          },
          {
            "ref": "vmls",
            "where": "Chapters 6–10, for matrix algebra."
          },
          {
            "ref": "3b1b-la",
            "where": "For a picture of what matrices do."
          }
        ]
      }
    }
  ]
}
;
