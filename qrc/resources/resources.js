/* QRC Resource Directory data. Edit this file to add or change entries.
   Everything after "window.QRC_DIRECTORY =" and before the final ";" must stay valid JSON
   (double quotes, no trailing commas) so the Python tools in tools/ can read it.
   Guides: short QRC-written on-ramps. kind "topic" shows at the top of its section; kind "how" is a standalone guide (home: order on the home page).
   In guide text, [[entry-id]] links a resource, [[guide:id]] links a guide, [[#section]] links a topic; add |label to change the link text.
   Home: the topic buttons students see first, in order. meta.person: the always-visible "talk to a person" line.
   Views: which sections each audience button shows, in order (null = all).
   Fields: id, title, url, by, section, type, audience[], level, courses[], cost, note, start, checked, pick, lu (true = used in Lawrence courses),
   internal (true = a page on this site; opens in the same tab), pick may also be a list of section ids where it is a pick; also[] (other sections where the entry should also appear) */
window.QRC_DIRECTORY =
{
  "meta": {"title": "QRC Resource Directory", "owner": "Quantitative Resource Center, Lawrence University", "version": "0.6", "updated": "2026-10-11", "contact": "Ask at the QRC desk (Seeley G. Mudd Library, second floor) or email the QRC director.", "person": {"text": "QRC drop-in tutoring: Sunday–Thursday, 6–9 p.m., Mudd Library, second floor. No appointment needed.", "link": "start"}, "selfcheck": {"text": "Not sure where you stand? Take a 10-minute self-check for MATH 102, 103, 140, or 155 and get a list of what to work on.", "link": "diagnostic.html"}},
  "home": ["foundations", "precalc", "geometry", "calculus", "multivar", "calcds", "stats", "proof", "linalg", "sciences", "social", "data", "tools", "study", "writing", "beyond"],
  "groups": [
    {"id": "lawrence", "label": "At Lawrence"},
    {"id": "courses", "label": "Course help"},
    {"id": "skills", "label": "Study and communicate"},
    {"id": "teach", "label": "For tutors, faculty, and staff"}
  ],
  "views": [
    {"id": "all", "label": "Everyone", "intro": "", "sections": null},
    {"id": "student", "label": "Students", "intro": "Help with your courses, how to study, and where to find a person. Tutor and faculty sections are hidden.", "sections": ["start", "foundations", "precalc", "geometry", "calculus", "multivar", "calcds", "proof", "linalg", "stats", "data", "sciences", "social", "tools", "study", "writing", "beyond"]},
    {"id": "tutor", "label": "Tutors", "intro": "Training first, then the resources to send students to. Faculty sections are hidden.", "sections": ["tutoring", "start", "foundations", "precalc", "geometry", "calculus", "multivar", "calcds", "proof", "linalg", "stats", "data", "sciences", "social", "tools", "study", "writing"]},
    {"id": "faculty", "label": "Faculty", "intro": "Teaching resources first, then campus services to refer students to, then open textbooks and tools you could assign.", "sections": ["teaching", "centers", "start", "study", "writing", "foundations", "precalc", "geometry", "calculus", "multivar", "calcds", "proof", "linalg", "stats", "data", "sciences", "social", "tools"]},
    {"id": "staff", "label": "Staff", "intro": "Spreadsheets, data, writing with numbers, and the QRC's own services. Course-specific sections are hidden.", "sections": ["start", "data", "social", "tools", "writing", "tutoring", "centers"]}
  ],
  "sections": [
    {"id": "start", "group": "lawrence", "title": "Start here at Lawrence", "need": "I want a person to help me, or I need to take the math placement.", "blurb": "Free campus services. These are the first stop when you want a person rather than a link.", "short": "Talk to a person, or take the placement"},
    {"id": "foundations", "group": "courses", "title": "Foundations and catching up", "need": "I'm rusty on fractions, algebra, or the basics, or I'm preparing for ALEKS.", "blurb": "Arithmetic through intermediate algebra. Matches MATH 102 and the early part of MATH 103.", "short": "Basics and algebra (MATH 102)"},
    {"id": "precalc", "group": "courses", "title": "Functions, precalculus, and trigonometry", "need": "I'm in MATH 103 or getting ready for calculus.", "blurb": "Functions, graphs, exponentials and logarithms, and trigonometry.", "short": "Precalculus (MATH 103)"},
    {"id": "geometry", "group": "courses", "title": "Geometry and further trigonometry", "need": "I want more trig or geometry than precalculus had time for.", "blurb": "Laws of sines and cosines, polar coordinates, conics, proofs in plane geometry, and the trig that calculus and physics lean on.", "short": "Geometry and further trig"},
    {"id": "calculus", "group": "courses", "title": "Calculus", "need": "I'm in MATH 140 or a calculus course like it.", "blurb": "Free textbooks with worked examples, lecture series, and problem books with answers.", "short": "Calculus (MATH 140)"},
    {"id": "multivar", "group": "courses", "title": "Multivariable and vector calculus", "need": "I'm in MATH 155, or I want to go past it to Green's, Stokes', and the divergence theorems.", "blurb": "Vectors, partial derivatives, multiple integrals, and vector calculus: line integrals, path independence, and the big theorems.", "short": "Multivariable calculus (MATH 155)"},
    {"id": "calcds", "group": "courses", "title": "Calculus for data science", "need": "I'm taking calculus for data science, or I want the math behind machine learning.", "blurb": "Derivatives and gradients for optimization, matrices for data, and the probability that ties them together.", "short": "Calculus for data science"},
    {"id": "proof", "group": "courses", "title": "Proof, logic, and discrete math", "need": "I'm in MATH 230, learning to write proofs, or working with formal logic.", "blurb": "Symbolic reasoning: proofs, sets, logic, counting, and graphs.", "short": "Discrete math and proofs (MATH 230)"},
    {"id": "linalg", "group": "courses", "title": "Matrices, linear algebra, and differential equations", "need": "I need matrix algebra, I'm in linear algebra, or I'm into vectors, matrices, or ODEs.", "blurb": "Free, well-regarded texts and video series for the second year of math.", "short": "Matrices and linear algebra"},
    {"id": "stats", "group": "courses", "title": "Statistics and probability", "need": "I'm in a stats course or using statistics in psychology, biology, or economics.", "blurb": "Open textbooks, visual explanations, and free apps for running analyses.", "short": "Statistics"},
    {"id": "data", "group": "courses", "title": "Data, spreadsheets, and code", "need": "I need Excel, R, or Python for a class, a thesis, or a job.", "blurb": "Free lessons and in-browser tools. No installation needed for most of these.", "short": "Excel, R, and Python"},
    {"id": "sciences", "group": "courses", "title": "Quantitative work in the sciences", "need": "The math in my physics, chemistry, or biology course is the problem.", "blurb": "Units, equations, and models as they show up in science courses.", "short": "Math in science courses"},
    {"id": "social", "group": "courses", "title": "Quantitative work in economics and social science", "need": "I need the math behind economics, or real data for a project.", "blurb": "Open economics texts and reliable public data sources.", "short": "Math in economics"},
    {"id": "tools", "group": "courses", "title": "Graphing and computing tools", "need": "I want to graph something, check an answer, or explore an idea.", "blurb": "Free calculators and math software. Check your course policy before using them on graded work.", "short": "Graphing calculators"},
    {"id": "study", "group": "skills", "title": "How to study math", "need": "I put in the hours but it isn't sticking, or math makes me anxious.", "blurb": "Research-based study strategies and resources on math anxiety and mindset.", "short": "Studying and math anxiety"},
    {"id": "writing", "group": "skills", "title": "Writing and presenting quantitative work", "need": "I have to write up math, make a chart, or present results.", "blurb": "Typesetting, data visualization, and writing with numbers.", "short": "Writing up math and making charts"},
    {"id": "beyond", "group": "skills", "title": "Beyond the course", "need": "I'm preparing for the GRE, or I want numbers to make sense in everyday life.", "blurb": "Graduate admissions tests and quantitative reasoning for its own sake.", "short": "GRE and everyday math"},
    {"id": "tutoring", "group": "teach", "title": "Tutoring practice and training", "need": "I tutor (or want to) and want to get better at it.", "blurb": "Standards and materials for peer tutors and the people who train them.", "short": "Tutor training"},
    {"id": "teaching", "group": "teach", "title": "Teaching quantitative reasoning", "need": "I teach a course with quantitative content, in any department.", "blurb": "Free guides, activities, and open textbooks for faculty.", "short": "Teaching quantitative reasoning"},
    {"id": "centers", "group": "teach", "title": "Running a quantitative center", "need": "I support or plan quantitative learning at Lawrence.", "blurb": "The professional literature on quantitative and math support centers.", "short": "Running a quantitative center"}
  ],
  "guides": [
    {
      "id": "first-visit",
      "kind": "how",
      "home": 1,
      "audience": [
        "student"
      ],
      "minutes": 3,
      "title": "Your first visit to the QRC",
      "intro": "Drop-in tutoring is free. You don't need an appointment, and you don't need to have finished the assignment.",
      "parts": [
        {
          "h": "Before you come",
          "p": "Bring the problem, your notes, and the textbook or Canvas page it came from. If you can, try the problem first and mark where you got stuck. A half-finished page is fine. So is a blank one."
        },
        {
          "h": "When you get there",
          "p": "Check the tutor board by the door to see who's on. Sign in, then tell the tutor your course and what you want to be able to do by the time you leave. Tutors often work with a few people at once, so you may start on your own for a few minutes."
        },
        {
          "h": "What tutors do",
          "p": "They ask questions, work a similar example with you, and check your reasoning. They won't do graded work for you, and they follow your course's collaboration policy."
        },
        {
          "h": "If drop-in isn't the right fit",
          "p": "To get a tutor for a specific course, request one through [[lu-peer-tutoring]]. For time management or study habits, meet with a coach at the [[lu-cas]]."
        }
      ]
    },
    {
      "id": "stuck",
      "kind": "how",
      "home": 2,
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Stuck on a problem? A 10-minute routine",
      "intro": "Most \"I don't get any of it\" turns out to be one stuck step. This routine finds it.",
      "parts": [
        {
          "h": "The routine",
          "ol": [
            "Write what the problem asks for in your own words.",
            "List what you know: the given values, plus the definitions and formulas from this section.",
            "Find the exact step where you stall. Is it a definition, choosing a method, the algebra, or reading the problem?",
            "Find a worked example of that step in your textbook or in [[pauls-notes]]. Copy it out by hand, then try yours again.",
            "Check your answer: units, sign, a rough estimate, or a quick graph in [[desmos]].",
            "Still stuck after 10 minutes? Bring what you wrote to the QRC. Your notes from steps 1–3 make a tutor's job much faster."
          ]
        }
      ]
    },
    {
      "id": "exam-10",
      "kind": "how",
      "home": 3,
      "audience": [
        "student"
      ],
      "minutes": 4,
      "title": "Studying for a math exam in 10 days",
      "intro": "Cramming feels productive and isn't. Short, mixed practice spread over a week and a half works better.",
      "parts": [
        {
          "h": "10 days out",
          "p": "List every topic on the exam from the syllabus or your instructor. Collect two or three practice problems per topic from homework, textbook review exercises, or old exams if your instructor shares them."
        },
        {
          "h": "Days 9 to 4",
          "p": "Do 30–40 minutes a day of mixed problems, without looking at your notes first. Mixing topics feels harder, and that's why it works ([[learning-scientists]]). Keep an error log: for each miss, write what went wrong and the fix."
        },
        {
          "h": "Days 3 and 2",
          "p": "Take a timed practice exam. Spend the next day on your error log only, and bring the two hardest problems to the QRC."
        },
        {
          "h": "The day before",
          "p": "Lightly review your error log and formulas, and read [[pauls-common-errors]]. Sleep matters more than one more hour of problems."
        }
      ],
      "tip": "To build a weekly study plan, meet with a coach at the [[lu-cas]]."
    },
    {
      "id": "aleks",
      "kind": "how",
      "home": 4,
      "audience": [
        "student",
        "faculty",
        "staff"
      ],
      "minutes": 3,
      "title": "Getting ready for the ALEKS placement",
      "intro": "ALEKS decides where you start in Lawrence math: MATH 102, MATH 103, or calculus (MATH 140).",
      "parts": [
        {
          "h": "How it works",
          "p": "ALEKS adapts to your answers, so it measures what you know rather than how many questions you get right. Scores of 75 or more place into MATH 140, 45–74 into MATH 103, and below 45 into MATH 102 ([[lu-aleks]])."
        },
        {
          "h": "Take it straight",
          "p": "Use only the tools the test gives you. A placement that's too high makes the course harder, not easier."
        },
        {
          "h": "Check yourself first",
          "p": "The [[qrc-selfcheck|QRC self-check]] for MATH 102 or 103 shows which skills to review, with a worksheet for each."
        },
        {
          "h": "If you want to place higher",
          "p": "After your first attempt, ALEKS gives you learning modules matched to your gaps. To retake the proctored test, wait 48 hours and spend at least five hours in the modules. [[khan]] and [[pauls-algebra]] are good companions."
        },
        {
          "h": "Not sure which course is right?",
          "p": "Talk with your adviser, or stop by the QRC during drop-in hours."
        }
      ]
    },
    {
      "id": "textbook",
      "kind": "how",
      "home": 5,
      "audience": [
        "student"
      ],
      "minutes": 3,
      "title": "How to learn from a free textbook",
      "intro": "Reading math isn't like reading a novel. Read with a pencil, and expect to go slowly.",
      "parts": [
        {
          "h": "The routine",
          "ol": [
            "Skim the section headings and the boxed definitions first, so you know where you're going.",
            "For each worked example, cover the solution and try it yourself before reading it.",
            "Do the short practice problems right after each example. In OpenStax books these are labeled \"Try It,\" and answers are in the back.",
            "If your course uses a different book, match by topic, not chapter number. Use the book's search or index."
          ]
        }
      ],
      "tip": "Many Lawrence math courses use OpenStax books, so your course text may already be free ([[openstax-library]]). For extra practice with full solutions, the [[clp-calculus]] problem books are hard to beat."
    },
    {
      "id": "videos",
      "kind": "how",
      "home": 6,
      "audience": [
        "student"
      ],
      "minutes": 2,
      "title": "Getting the most out of math videos",
      "intro": "Watching someone else solve a problem feels like learning. It only counts once you can do one yourself.",
      "parts": [
        {
          "h": "The routine",
          "ol": [
            "Watch with paper and pencil, not in bed.",
            "Pause before each step and predict what comes next.",
            "Speed up the parts you know and slow down the parts you don't.",
            "Right after, do one problem on your own with the video closed.",
            "If three videos haven't helped, switch to a person. Come to the QRC."
          ]
        }
      ],
      "tip": "Good places to start: [[khan]] for short skill videos, [[prof-leonard]] for full lectures, [[3b1b-calculus]] for the big ideas, and [[statquest]] for statistics."
    },
    {
      "id": "email-prof",
      "kind": "how",
      "home": 7,
      "audience": [
        "student"
      ],
      "minutes": 2,
      "title": "Asking your professor for help",
      "intro": "Office hours are for every student, not only for students in trouble. Professors like specific questions.",
      "parts": [
        {
          "h": "In person",
          "p": "Go to office hours with one or two specific problems and the work you've tried. It's fine to say, \"I don't know where to start.\""
        },
        {
          "h": "By email",
          "p": "Put the course and topic in the subject line. Say what you tried, ask one clear question, and attach a photo of your work."
        }
      ],
      "box": "Subject: MATH 140, question on 3.4 #12\n\nHi Professor ___,\n\nI'm working on problem 12 in section 3.4. I used the chain rule (my work is attached), but my answer doesn't match the back of the book. Is my setup right, or could I come to office hours Tuesday to go over it?\n\nThanks,\n[Your name]"
    },
    {
      "id": "tutor-shift",
      "kind": "how",
      "audience": [
        "tutor"
      ],
      "minutes": 3,
      "title": "Your first shift as a QRC tutor",
      "intro": "You don't need to know everything. You need a routine and the confidence to say, \"Let's find out together.\"",
      "parts": [
        {
          "h": "Open (three minutes)",
          "p": "Ask, \"What's your goal today?\" and \"Show me where it stalled.\" Agree on at most two things to get done."
        },
        {
          "h": "Work",
          "p": "Ask for decisions (\"What tells you to use substitution here?\"). Model one step, do the next together, then let them do one alone. When several students are waiting, give each a next step and rotate."
        },
        {
          "h": "Close (three minutes)",
          "p": "Have the student summarize what they learned in a sentence or two, and suggest when to practice again. Then write the session summary in Navigate."
        },
        {
          "h": "When you don't know",
          "p": "Say so, and look it up together in [[pauls-notes]] or the course text. Students learn a lot from watching how you get unstuck."
        }
      ],
      "tip": "The QRC trains to the [[crla-ittpc]] standards. The scenarios in [[qmasc-training]] make good practice."
    },
    {
      "id": "faculty-refer",
      "kind": "how",
      "audience": [
        "faculty"
      ],
      "minutes": 2,
      "title": "Sending your students to the QRC",
      "intro": "Students come when an instructor they trust names a specific reason to go.",
      "parts": [
        {
          "h": "Three things that help most",
          "ol": [
            "Put a line about the QRC in your syllabus and on Canvas (sample below).",
            "Send the QRC your exam dates so we can plan review sessions and staffing.",
            "Mention the QRC the week before an exam, and name what tutors can help with."
          ]
        },
        {
          "h": "Link to a topic",
          "p": "Each topic on this page has its own address. Add #calculus, #precalc, #stats, or #foundations to the end of this page's address to send students straight to that topic."
        }
      ],
      "box": "Free help: The Quantitative Resource Center (QRC) offers drop-in tutoring Sunday–Thursday, 6–9 p.m., on the second floor of Mudd Library. No appointment needed. The QRC Resource Directory lists free textbooks, videos, and practice for this course.",
      "tip": "For building quantitative reasoning into your own course, start with [[serc-qr]]. For free textbooks, see [[aim-otl]]."
    },
    {
      "id": "t-foundations",
      "kind": "topic",
      "section": "foundations",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: basics and algebra",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Name the skill (fractions, exponents, factoring) and search for it on [[khan]]. Watch one video, then do the practice set until you get three in a row."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the matching section of [[openstax-prealgebra]] or [[openstax-intalg]] and work the \"Try It\" problems. Then read [[pauls-common-errors]]. Most algebra trouble is on that page."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Use a Khan Academy unit test or course challenge to find your gaps, then spend 20 minutes a day on only those. Preparing for placement? See [[guide:aleks]]. Not sure which skills? Take the [[qrc-selfcheck|MATH 102 self-check]]."
        }
      ],
      "tip": "Fractions and negative signs cause more trouble than anything else at this level. If they feel shaky, start there."
    },
    {
      "id": "t-precalc",
      "kind": "topic",
      "section": "precalc",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: precalculus",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Graph it. Type the function into [[desmos]] and add a slider for the number you're unsure about. Watch what changes."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the matching section of [[openstax-precalc]], then work examples from [[pauls-algebra]], which has full solutions."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Functions, exponentials and logarithms, and trigonometry are the backbone of calculus. Work through [[pauls-algtrig-review]] one topic a day. Not sure which skills? Take the [[qrc-selfcheck|MATH 103 self-check]]."
        }
      ],
      "tip": "Logarithms trip up many MATH 103 students. A logarithm undoes an exponential: log_b(x) = y means b^y = x. Every log rule comes from an exponent rule."
    },
    {
      "id": "t-calculus",
      "kind": "topic",
      "section": "calculus",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: calculus",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Find your topic in [[pauls-calc]] and read the worked example closest to your problem."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the section in [[openstax-calc]], then do problems from the [[clp-calculus]] problem books, which give hints, answers, and full solutions."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Weak algebra is the most common reason calculus feels hard. Spend 15 minutes a day on [[pauls-algtrig-review]] alongside your course. For the big ideas, watch [[3b1b-calculus]]. Not sure which skills? Take the [[qrc-selfcheck|MATH 140 or 155 self-check]]."
        }
      ],
      "tip": "Most calculus mistakes are algebra mistakes. Check [[pauls-common-errors]] before you decide you don't understand the calculus."
    },
    {
      "id": "t-stats",
      "kind": "topic",
      "section": "stats",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: statistics",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Find the idea in [[seeing-theory]] and play with the picture until the definition makes sense."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the matching section of [[openintro-stats]] and do its guided practice, which has answers. Then watch the [[statquest]] video on the same idea."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "For a project or thesis, learn one tool well: [[jamovi]] if you want menus, or [[r4ds]] if you want to write code."
        }
      ],
      "tip": "If p-values and confidence intervals feel slippery, you're in good company. The simulation apps in [[artofstat]] show what they mean."
    },
    {
      "id": "t-proof",
      "kind": "topic",
      "section": "proof",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: discrete math and proofs",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Write out the definition of every term in the statement. Most proofs begin by unpacking definitions."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the matching section of [[reed-discrete]], then the chapter of [[book-of-proof]] on the method you're using: direct proof, contrapositive, contradiction, or induction."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Work a few exercises from each proof-technique chapter of Book of Proof. Bring drafts to the QRC. Proof writing gets better with a reader."
        }
      ],
      "tip": "Before you try to prove something, test it on small examples. They often show you why it's true."
    },
    {
      "id": "t-linalg",
      "kind": "topic",
      "section": "linalg",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: linear algebra and differential equations",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Watch the [[3b1b-la]] video on your topic to see the geometry."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the section in [[understanding-la]] and do its activities. For differential equations, use [[pauls-de]]."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "[[mit-1806sc]] is a full course with problem sets and solutions."
        }
      ],
      "tip": "Many linear algebra questions get easier when you ask what the matrix does to a vector."
    },
    {
      "id": "t-sciences",
      "kind": "topic",
      "section": "sciences",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: math in science courses",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Check the units. Write every quantity with its units and see whether they combine into the units of the answer."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Work the matching module of [[math-you-need]] (unit conversions, rearranging equations, logarithms). Look up the concept on [[hyperphysics]] or [[chem-libretexts]]."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "If algebra is the bottleneck, work through [[#foundations|basics and algebra]] alongside your science course."
        }
      ],
      "tip": "Solve the equation for the unknown before you plug in numbers. It's easier to check and to reuse."
    },
    {
      "id": "t-social",
      "kind": "topic",
      "section": "social",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: math in economics",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Sketch the graph. Most introductory economics problems are about a slope or the point where two lines cross."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the appendix on graphs in [[openstax-econ]], then the matching chapter of [[core-econ]]."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Practice with real data: download a series from [[fred]] and chart it in Excel ([[#data|help with Excel]])."
        }
      ],
      "tip": "A rate that goes from 4% to 5% rose one percentage point, which is a 25% increase. Say which one you mean."
    },
    {
      "id": "t-data",
      "kind": "topic",
      "section": "data",
      "audience": [
        "student",
        "tutor",
        "staff"
      ],
      "minutes": 2,
      "title": "Start here: Excel, R, and Python",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Search for the exact task or error message, such as \"Excel VLOOKUP\" or \"R read csv.\" Then check the official help in [[excel-ms]] or [[r4ds]]."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "New to Excel? Start with [[excel-gcf]]. For R, read the first chapters of [[r4ds]] in [[posit-cloud]], with nothing to install. For Python, use [[py4e]] in [[colab]]."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Pick one tool and one small project with your own data. The [[carpentries]] lessons are built for exactly this."
        }
      ],
      "tip": "Keep your raw data in its own untouched file, and do all your cleaning in a copy."
    },
    {
      "id": "t-tools",
      "kind": "topic",
      "section": "tools",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 1,
      "title": "Start here: graphing calculators",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Open [[desmos]], type your function, and add sliders for the constants."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Use tools to check your work, not to replace it. Solve by hand, then confirm with [[wolframalpha]] or [[geogebra]]."
        }
      ],
      "tip": "Follow your course's policy on which tools are allowed for graded work."
    },
    {
      "id": "t-study",
      "kind": "topic",
      "section": "study",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: studying and math anxiety",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Try the [[guide:stuck|10-minute routine for when you're stuck]]."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the [[learning-scientists]] posters on retrieval practice and interleaving. Then test yourself on last week's material without notes."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Plan your next exam with [[guide:exam-10|the 10-day exam plan]]. If anxiety gets in the way, [[youcubed]] has good reading on math mindset, and a coach at the [[lu-cas]] can help you make a plan."
        }
      ],
      "tip": "Feeling anxious about math is common and doesn't mean you're bad at it. If anxiety is affecting more than math, campus counseling services can help."
    },
    {
      "id": "t-writing",
      "kind": "topic",
      "section": "writing",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: writing up math and making charts",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "For a chart, write the one sentence you want it to say, and use that sentence as its title."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "To typeset math, work through [[overleaf-30]]. For charts and posters, see the [[cmu-handouts]]."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Read [[serc-quant-writing]] on writing with numbers, and take a draft to writing tutoring ([[lu-peer-tutoring]])."
        }
      ]
    },
    {
      "id": "t-beyond",
      "kind": "topic",
      "section": "beyond",
      "audience": [
        "student"
      ],
      "minutes": 1,
      "title": "Start here: the GRE and everyday math",
      "parts": [
        {
          "h": "Behind on a topic · an evening",
          "p": "Take one free official practice test from [[gre-prep]] to see where you stand."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Review the topics you missed with [[khan]], and bring problems to the QRC. For everyday numbers, the finance chapter of [[openstax-contemp]] covers interest, loans, and budgets."
        }
      ]
    },
    {
      "id": "t-multivar",
      "kind": "topic",
      "section": "multivar",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: multivariable calculus",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Find your topic in [[pauls-calc3]] and read the worked example closest to your problem."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the matching section of [[openstax-calc3]] and watch the [[khan-multivar]] video on the same idea. The pictures matter more here than in single-variable calculus."
        },
        {
          "h": "Going past MATH 155 · a few weeks",
          "p": "Path independence, Green's theorem, curl and divergence, Stokes' theorem, and the divergence theorem are all in Chapter 6 of [[openstax-calc3]] and the last chapters of [[pauls-calc3]]. [[mit-1802sc]] has problem sets with solutions for all of them."
        }
      ],
      "tip": "Most of vector calculus is one idea: integrating a derivative over a region equals integrating the original function over the boundary. The Fundamental Theorem, Green's, Stokes', and the divergence theorem are all versions of it."
    },
    {
      "id": "t-geometry",
      "kind": "topic",
      "section": "geometry",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: geometry and further trig",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Draw it. Label every known side and angle, then decide whether you have a right triangle or need the laws of sines and cosines."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the chapter on further applications of trigonometry in [[openstax-precalc]] (laws of sines and cosines, polar coordinates, vectors) or the general-triangles chapter of [[corral-trig]]."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "For geometry with proofs, work through Book I of [[euclid-joyce]], constructing each figure in [[geogebra]] as you go."
        }
      ],
      "tip": "Calculus and physics use the unit circle, the Pythagorean identity, and similar triangles constantly. Time spent here pays off later."
    },
    {
      "id": "t-calcds",
      "kind": "topic",
      "section": "calcds",
      "audience": [
        "student",
        "tutor"
      ],
      "minutes": 2,
      "title": "Start here: calculus for data science",
      "parts": [
        {
          "h": "Stuck right now · 10 minutes",
          "p": "Watch the [[3b1b-nn]] video on gradient descent. It shows what a derivative is for in machine learning: finding the direction that lowers the error."
        },
        {
          "h": "Behind on a topic · an evening",
          "p": "Read the vector calculus chapter of [[mml-book]]. For the matrix side, read the matrix chapters of [[vmls]]."
        },
        {
          "h": "Rebuilding a skill · a few weeks",
          "p": "Build something: fit a line to real data by least squares in [[colab]], then by gradient descent, and compare. [[vmls]] walks through exactly this."
        }
      ],
      "tip": "Three ideas carry most of the math in data science: the derivative as a rate, the gradient as a direction, and the matrix as a way to handle many numbers at once."
    }
  ],
  "entries": [
    {"id": "lu-qrc-dropin", "title": "QRC drop-in tutoring", "url": "https://inside.lawrence.edu/offices/center-academic-success/tutoring-programs-services", "by": "Lawrence University", "section": "start", "type": "Service", "audience": ["student", "staff", "faculty", "tutor"], "level": "All levels", "courses": ["MATH 102", "MATH 103", "MATH 140", "Q courses"], "cost": "Free", "note": "Peer tutors for 100- and 200-level math and Q-requirement courses. No appointment needed. Bring your work and a specific question if you can.", "start": "Mudd Library, second floor, Sunday–Thursday, 6–9 p.m. Check the tutor board for who is on tonight.", "checked": "2026-10-03", "pick": true},
    {"id": "lu-peer-tutoring", "title": "Course tutors through Navigate", "url": "https://inside.lawrence.edu/offices/center-academic-success/tutoring-programs-services", "by": "Lawrence University, Center for Academic Success", "section": "start", "type": "Service", "audience": ["student", "faculty", "tutor"], "level": "All levels", "courses": [], "cost": "Free", "note": "One-on-one and small-group content tutoring for specific courses, plus writing, oral communication, and multilingual support. Request a tutor in MyLU Navigate or ask your instructor.", "start": "Check your course's Canvas site or syllabus for an assigned tutor first.", "checked": "2026-10-03", "pick": false},
    {"id": "lu-cas", "title": "Center for Academic Success", "url": "https://www.lawrence.edu/offices/center-academic-success", "by": "Lawrence University", "section": "start", "type": "Service", "audience": ["student", "staff", "faculty", "tutor"], "level": "All levels", "courses": [], "cost": "Free", "note": "Success coaching on time, motivation, and study habits, academic skills workshops, and peer tutoring programs. A good next step when the problem is bigger than one course.", "start": "Mudd Library, second floor, weekdays 8 a.m.–5 p.m. Book a coaching meeting from the CAS page.", "checked": "2026-10-03", "pick": false},
    {"id": "lu-aleks", "title": "ALEKS math placement", "url": "https://inside.lawrence.edu/academics/college/mathematics/placement-testing", "by": "Lawrence University, Department of Mathematics", "section": "start", "type": "Guide", "audience": ["student", "faculty", "staff", "tutor"], "level": "Foundational", "courses": ["MATH 102", "MATH 103", "MATH 140", "PHYS 141"], "cost": "Free for Lawrence students", "note": "Required before math or physics courses. Scores of 75+ place into calculus (MATH 140), 45–74 into MATH 103, and below 45 into MATH 102. After your first attempt you get personalized ALEKS learning modules.", "start": "To retake the proctored test, wait 48 hours and complete at least 5 hours in the learning modules.", "checked": "2026-10-03", "pick": true},
    {"id": "qrc-selfcheck", "title": "QRC course self-check", "url": "diagnostic.html", "internal": true, "by": "Quantitative Resource Center", "section": "start", "also": ["foundations", "precalc", "calculus"], "type": "Tool", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": ["MATH 102", "MATH 103", "MATH 140", "MATH 155"], "cost": "Free", "note": "About 16 questions for MATH 102, 103, 140, or 155. You get a list of the skills to work on, in order, with a QRC worksheet and free resources for each. It isn't a placement test, and nothing you enter is saved.", "start": "Pick the course you're in or headed to.", "checked": "2026-10-10", "pick": ["start"], "lu": true},
    {"id": "lu-math-courses", "title": "Mathematics course descriptions", "url": "https://inside.lawrence.edu/academics/college/mathematics/course-descriptions", "by": "Lawrence University, Department of Mathematics", "section": "start", "type": "Guide", "audience": ["student", "tutor", "faculty", "staff"], "level": "All levels", "courses": ["MATH 102", "MATH 103", "MATH 140", "MATH 155", "MATH 230"], "cost": "Free", "note": "Official descriptions and prerequisites for every math course, from MATH 102 (Foundations in Math) through calculus and beyond. MATH 103 and 140 need an ALEKS score (45 and 75) or a C− or better in the course before.", "start": "The course catalog is the official source for planning.", "checked": "2026-10-10", "pick": false},
    {"id": "lu-library", "title": "Seeley G. Mudd Library", "url": "https://www.lawrence.edu/library", "by": "Lawrence University", "section": "start", "type": "Service", "audience": ["student", "faculty", "staff"], "level": "All levels", "courses": [], "cost": "Free", "note": "Research help, data and systems librarianship, course reserves, and quiet study space. The QRC and CAS are on the library's second floor.", "start": "Ask at the main desk for help finding data or a statistics text.", "checked": null, "pick": false},
    {"id": "openstax-library", "title": "OpenStax textbook library", "url": "https://openstax.org/higher-education", "by": "OpenStax, Rice University", "section": "start", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": [], "cost": "Free (CC BY)", "note": "Free, peer-reviewed textbooks in math, statistics, the sciences, economics, and more. Lawrence's intro math courses use OpenStax texts, so your assigned book may already be free here as a web page, PDF, or app.", "start": "Check your syllabus for the book title, then find it by subject.", "checked": "2026-10-03", "pick": false, "lu": true},
    {"id": "khan", "title": "Khan Academy", "url": "https://www.khanacademy.org/", "by": "Khan Academy (nonprofit)", "section": "foundations", "type": "Course", "audience": ["student", "tutor"], "level": "Foundational to intro", "courses": ["MATH 102", "MATH 103"], "cost": "Free", "note": "Short videos and unlimited practice with instant feedback, arranged in mastery units. Good for filling a specific gap (negative numbers, fractions, factoring) without redoing a whole course.", "start": "Use a unit test or course challenge to find your gaps, then work only those skills.", "checked": null, "pick": true},
    {"id": "openstax-prealgebra", "title": "Prealgebra 2e", "url": "https://openstax.org/details/books/prealgebra-2e", "by": "OpenStax, Rice University", "section": "foundations", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Foundational", "courses": ["MATH 102"], "cost": "Free (CC BY)", "note": "A complete, peer-reviewed text on whole numbers, fractions, decimals, percents, and an introduction to algebra. Every section has worked examples followed by \"try it\" problems with answers.", "start": "The fractions and decimals chapters are the most-used review.", "checked": "2026-10-03", "pick": true, "lu": true},
    {"id": "openstax-intalg", "title": "Intermediate Algebra 2e", "url": "https://openstax.org/details/books/intermediate-algebra-2e", "by": "OpenStax, Rice University", "section": "foundations", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Foundational", "courses": ["MATH 102", "MATH 103"], "cost": "Free (CC BY)", "note": "Linear equations, systems, polynomials, rational expressions, radicals, and quadratics, with lots of practice. A good bridge from MATH 102 into MATH 103.", "start": "Use the chapter review exercises as a self-check before an exam.", "checked": null, "pick": false, "lu": true},
    {"id": "pauls-notes", "title": "Paul's Online Math Notes", "url": "https://tutorial.math.lamar.edu/", "by": "Paul Dawkins, Lamar University", "section": "foundations", "type": "Guide", "audience": ["student", "tutor"], "level": "Foundational to intermediate", "courses": ["MATH 103", "MATH 140"], "cost": "Free", "note": "Clear class notes with many worked examples for algebra through differential equations, with practice problems and solutions. Students often find these easier to read than their textbook. It also has review pages on algebra and trig for calculus students.", "start": "For a quick refresher, try the Algebra/Trig Review under Extras, or the cheat sheets.", "checked": "2026-10-03", "pick": true},
    {"id": "pauls-cheatsheets", "title": "Algebra, trig, and calculus cheat sheets", "url": "https://tutorial.math.lamar.edu/extras/cheatsheets_tables.aspx", "by": "Paul Dawkins, Lamar University", "section": "foundations", "type": "Handout", "audience": ["student", "tutor"], "level": "Foundational to intro", "courses": ["MATH 102", "MATH 103", "MATH 140"], "cost": "Free", "note": "Printable reference sheets: algebra rules, common errors, trig identities, and derivative and integral tables. The \"common algebra errors\" sheet is useful before any exam.", "start": "Print the algebra sheet for your notebook.", "checked": "2026-10-03", "pick": false, "also": ["precalc", "calculus"]},
    {"id": "pauls-common-errors", "title": "Common math errors", "url": "https://tutorial.math.lamar.edu/Extras/CommonErrors/CommonErrors.aspx", "by": "Paul Dawkins, Lamar University", "section": "foundations", "also": ["precalc", "calculus", "study"], "type": "Guide", "audience": ["student", "tutor"], "level": "Foundational to intro", "courses": ["MATH 102", "MATH 103", "MATH 140"], "cost": "Free", "note": "A short catalog of the algebra and calculus mistakes Paul Dawkins sees most often, each with the correct version. A good page to read the night before an exam.", "start": "", "checked": "2026-10-10", "pick": false},
    {"id": "openstax-precalc", "title": "Precalculus 2e", "url": "https://openstax.org/details/books/precalculus-2e", "by": "OpenStax, Rice University", "section": "precalc", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["MATH 103"], "cost": "Free (CC BY)", "note": "Functions, polynomial and rational functions, exponentials and logarithms, trigonometry, and conics. Clean examples and many practice problems with odd answers in the back.", "start": "Chapter 1 (functions) and chapter 4 (exponential and logarithmic functions) match the core of MATH 103.", "checked": "2026-10-03", "pick": ["precalc"], "lu": true, "also": ["geometry"]},
    {"id": "openstax-collegealg", "title": "College Algebra 2e", "url": "https://openstax.org/details/books/college-algebra-2e", "by": "OpenStax, Rice University", "section": "precalc", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["MATH 102", "MATH 103"], "cost": "Free (CC BY)", "note": "The algebra half of precalculus without trigonometry: equations, inequalities, functions, and systems.", "start": "Use it when your course is algebra-heavy and you want more practice than your text offers.", "checked": "2026-10-03", "pick": false, "lu": true},
    {"id": "stitz-zeager", "title": "Precalculus (Stitz and Zeager)", "url": "https://www.stitz-zeager.com/", "by": "Carl Stitz and Jeff Zeager", "section": "precalc", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["MATH 103"], "cost": "Free (Creative Commons)", "note": "A widely adopted open precalculus text with careful explanations, available as PDF and as interactive online lessons. Approved by the American Institute of Mathematics.", "start": "Its function chapters explain why, not just how.", "checked": "2026-10-03", "pick": false},
    {"id": "pauls-algebra", "title": "Paul's Online Notes: Algebra", "url": "https://tutorial.math.lamar.edu/Classes/Alg/Alg.aspx", "by": "Paul Dawkins, Lamar University", "section": "precalc", "type": "Guide", "audience": ["student", "tutor"], "level": "Foundational to intro", "courses": ["MATH 102", "MATH 103"], "cost": "Free", "note": "Clear notes with many worked examples on equations, functions, polynomial and rational functions, exponentials and logarithms, and systems. Each section has practice problems with full solutions.", "start": "The Exponential and Logarithm Functions chapter is a common MATH 103 rescue.", "checked": null, "pick": true},
    {"id": "pauls-algtrig-review", "title": "Paul's Online Notes: Algebra/Trig Review", "url": "https://tutorial.math.lamar.edu/Extras/AlgebraTrigReview/AlgebraTrig.aspx", "by": "Paul Dawkins, Lamar University", "section": "precalc", "also": ["calculus"], "type": "Guide", "audience": ["student", "tutor"], "level": "Intro", "courses": ["MATH 103", "MATH 140"], "cost": "Free", "note": "A self-test of the algebra and trig that calculus assumes: exponents, logarithms, trig functions and identities, and solving equations. Each problem has a worked solution.", "start": "Do one topic a day alongside your calculus course.", "checked": "2026-10-10", "pick": false},
    {"id": "active-calculus", "title": "Active Calculus", "url": "https://activecalculus.org/", "by": "Matt Boelkins and collaborators", "section": "calculus", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["MATH 140"], "cost": "Free (Creative Commons)", "note": "Built around short activities that ask you to work out ideas before they are stated. Good for understanding why derivatives and integrals work, not just the rules.", "start": "Try the \"preview activity\" at the start of a section before reading it.", "checked": null, "pick": false},
    {"id": "clp-calculus", "title": "CLP Calculus texts and problem books", "url": "https://personal.math.ubc.ca/~CLP/", "by": "Feldman, Rechnitzer, and Yeager, University of British Columbia", "section": "calculus", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro to intermediate", "courses": ["MATH 140"], "cost": "Free", "note": "Four free texts (differential, integral, multivariable, and vector calculus), each with a separate problem book that has hints, answers, and full solutions. The problem books are the best free source of calculus practice we know.", "start": "CLP-1 problem book for derivatives; CLP-2 for integrals.", "checked": "2026-10-03", "pick": ["calculus"], "also": ["multivar"]},
    {"id": "openstax-calc", "title": "Calculus, Volumes 1–3", "url": "https://openstax.org/details/books/calculus-volume-1", "by": "OpenStax, Rice University", "section": "calculus", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro to intermediate", "courses": ["MATH 140"], "cost": "Free (CC BY)", "note": "A conventional three-volume calculus sequence, similar in layout to commercial textbooks. Useful as a second explanation of any standard topic.", "start": "Volume 1 covers limits, derivatives, and an introduction to integration.", "checked": null, "pick": true, "lu": true},
    {"id": "apex-calculus", "title": "APEX Calculus", "url": "https://www.apexcalculus.com/", "by": "Gregory Hartman and collaborators", "section": "calculus", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro to intermediate", "courses": ["MATH 140"], "cost": "Free (Creative Commons)", "note": "A complete open calculus text with interactive 3D graphics in the online version. Approved by the American Institute of Mathematics.", "start": "", "checked": null, "pick": false},
    {"id": "mit-1801sc", "title": "MIT 18.01SC Single Variable Calculus", "url": "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/", "by": "MIT OpenCourseWare", "section": "calculus", "type": "Course", "audience": ["student", "tutor"], "level": "Intro", "courses": ["MATH 140"], "cost": "Free (CC BY-NC-SA)", "note": "A full self-study calculus course: lecture videos, short recitation videos by teaching assistants, problem sets, and exams with solutions.", "start": "The recitation videos walk through one problem each and are good for a single stuck topic.", "checked": null, "pick": false},
    {"id": "3b1b-calculus", "title": "Essence of Calculus (3Blue1Brown)", "url": "https://www.3blue1brown.com/topics/calculus", "by": "Grant Sanderson", "section": "calculus", "type": "Video", "audience": ["student", "tutor"], "level": "Intro", "courses": ["MATH 140"], "cost": "Free", "note": "A short animated series on the big ideas of calculus: derivatives as rates, integrals as accumulation, and why the two are connected. Best watched before or alongside a course, not instead of practice.", "start": "", "checked": null, "pick": false, "also": ["calcds"]},
    {"id": "prof-leonard", "title": "Professor Leonard lectures", "url": "https://www.youtube.com/@ProfessorLeonard", "by": "Leonard (community college instructor), YouTube", "section": "calculus", "type": "Video", "audience": ["student"], "level": "Intro to intermediate", "courses": ["MATH 102", "MATH 103", "MATH 140", "STAT"], "cost": "Free", "note": "Full-length, unhurried classroom lectures on intermediate algebra, precalculus, Calculus I–III, statistics, and differential equations. They're long, but students who want every step written out love them.", "start": "Search the channel for your exact topic rather than starting at lecture 1.", "checked": null, "pick": ["precalc"], "also": ["foundations", "precalc", "stats", "linalg"]},
    {"id": "pauls-calc", "title": "Paul's Online Notes: Calculus I, II, and III", "url": "https://tutorial.math.lamar.edu/Classes/CalcI/CalcI.aspx", "by": "Paul Dawkins, Lamar University", "section": "calculus", "type": "Guide", "audience": ["student", "tutor"], "level": "Intro to intermediate", "courses": ["MATH 140"], "cost": "Free", "note": "Many students find these easier to read than their textbook: short explanations, lots of worked examples, and practice problems with step-by-step solutions for limits, derivatives, integrals, series, and multivariable calculus.", "start": "Calculus I for MATH 140. Calculus II and III are linked from the site's menu.", "checked": "2026-10-03", "pick": ["calculus"], "also": ["multivar"]},
    {"id": "openstax-calc3", "title": "Calculus, Volume 3", "url": "https://openstax.org/details/books/calculus-volume-3", "by": "OpenStax, Rice University", "section": "multivar", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intermediate", "courses": ["MATH 155"], "cost": "Free (CC BY)", "note": "Free multivariable text: vectors, curves, partial derivatives, and multiple integrals, then a full vector calculus chapter with line integrals, conservative fields and path independence, Green's theorem, surface integrals, Stokes' theorem, and the divergence theorem.", "start": "Chapter 6, Vector Calculus, for everything past MATH 155.", "checked": null, "pick": true},
    {"id": "pauls-calc3", "title": "Paul's Online Notes: Calculus III", "url": "https://tutorial.math.lamar.edu/Classes/CalcIII/CalcIII.aspx", "by": "Paul Dawkins, Lamar University", "section": "multivar", "type": "Guide", "audience": ["student", "tutor"], "level": "Intermediate", "courses": ["MATH 155"], "cost": "Free", "note": "Worked-example notes for all of multivariable calculus, through line integrals, the fundamental theorem for line integrals (path independence), Green's theorem, curl and divergence, surface integrals, Stokes' theorem, and the divergence theorem.", "start": "The Line Integrals and Surface Integrals chapters go past MATH 155.", "checked": "2026-10-11", "pick": true},
    {"id": "khan-multivar", "title": "Khan Academy: Multivariable calculus", "url": "https://www.khanacademy.org/math/multivariable-calculus", "by": "Khan Academy (videos by Grant Sanderson of 3Blue1Brown)", "section": "multivar", "type": "Course", "audience": ["student", "tutor"], "level": "Intermediate", "courses": ["MATH 155"], "cost": "Free", "note": "Visual video lessons on partial derivatives, gradients, multiple integrals, and the vector calculus theorems, with especially clear treatments of divergence, curl, Green's, Stokes', and the divergence theorem.", "start": "", "checked": null, "pick": true},
    {"id": "mit-1802sc", "title": "MIT 18.02SC Multivariable Calculus", "url": "https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/", "by": "MIT OpenCourseWare", "section": "multivar", "type": "Course", "audience": ["student", "tutor"], "level": "Intermediate", "courses": ["MATH 155"], "cost": "Free (CC BY-NC-SA)", "note": "A full self-study course with lecture videos, recitation videos, problem sets, and exams with solutions, including matrices, Green's theorem, Stokes' theorem, and the divergence theorem.", "start": "", "checked": "2026-10-11", "pick": false},
    {"id": "reed-discrete", "title": "Discrete Structures", "url": "https://people.reed.edu/~davidp/113/resources/113full_text.pdf", "by": "Kyle Ormsby and David Perkinson, Reed College", "section": "proof", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro to intermediate", "courses": ["MATH 230"], "cost": "Free PDF", "note": "The text for MATH 230, Discrete Mathematics, which comes after MATH 155. Written for Reed's Math 113, it covers counting, sets, graph theory, probability, number theory and modular arithmetic, and generating functions.", "start": "Reed's Math 113 course page (people.reed.edu/~davidp/113/) has lecture videos and review sheets that follow the book.", "checked": "2026-10-03", "pick": true, "lu": true},
    {"id": "book-of-proof", "title": "Book of Proof", "url": "https://textbooks.aimath.org/textbooks/approved-textbooks/hammack/", "by": "Richard Hammack", "section": "proof", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intermediate", "courses": [], "cost": "Free PDF", "note": "A gentle, popular introduction to sets, logic, and proof techniques (direct, contrapositive, contradiction, induction). Many exercises have solutions.", "start": "Part II, on how to write a proof, is the core.", "checked": "2026-10-03", "pick": true},
    {"id": "forallx", "title": "forall x: Calgary", "url": "https://forallx.openlogicproject.org/", "by": "P. D. Magnus, Tim Button, and the Open Logic Project", "section": "proof", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": [], "cost": "Free (CC BY)", "note": "An open introduction to formal logic: truth tables, natural deduction, and first-order logic. Used in many philosophy and logic courses.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "levin-discrete", "title": "Discrete Mathematics: An Open Introduction", "url": "https://discrete.openmathbooks.org/", "by": "Oscar Levin", "section": "proof", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intermediate", "courses": [], "cost": "Free (Creative Commons)", "note": "Counting, sequences, logic and proofs, and graph theory, written for students meeting proofs for the first time. Approved by the American Institute of Mathematics.", "start": "", "checked": null, "pick": false},
    {"id": "understanding-la", "title": "Understanding Linear Algebra", "url": "https://understandinglinearalgebra.org/", "by": "David Austin, Grand Valley State University", "section": "linalg", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intermediate", "courses": [], "cost": "Free (Creative Commons)", "note": "An open text that emphasizes geometric meaning and applications, with interactive computation built into the online version.", "start": "", "checked": null, "pick": true},
    {"id": "3b1b-la", "title": "Essence of Linear Algebra (3Blue1Brown)", "url": "https://www.3blue1brown.com/topics/linear-algebra", "by": "Grant Sanderson", "section": "linalg", "type": "Video", "audience": ["student", "tutor"], "level": "Intermediate", "courses": [], "cost": "Free", "note": "Animated videos that show matrices as transformations of space. Many students say this is when linear algebra finally made sense.", "start": "", "checked": null, "pick": ["linalg"], "also": ["calcds"]},
    {"id": "mit-1806sc", "title": "MIT 18.06SC Linear Algebra", "url": "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/", "by": "Gilbert Strang, MIT OpenCourseWare", "section": "linalg", "type": "Course", "audience": ["student", "tutor"], "level": "Intermediate", "courses": [], "cost": "Free (CC BY-NC-SA)", "note": "Strang's well-known lectures with recitation videos, problem sets, and exams with solutions.", "start": "", "checked": null, "pick": false},
    {"id": "lebl-diffyqs", "title": "Notes on Diffy Qs", "url": "https://www.jirka.org/diffyqs/", "by": "Jiří Lebl", "section": "linalg", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intermediate", "courses": [], "cost": "Free (Creative Commons)", "note": "A free introductory differential equations text covering first-order equations, linear systems, Fourier series, and Laplace transforms. Approved by the American Institute of Mathematics.", "start": "", "checked": null, "pick": false},
    {"id": "pauls-de", "title": "Paul's Online Notes: Differential Equations", "url": "https://tutorial.math.lamar.edu/Classes/DE/DE.aspx", "by": "Paul Dawkins, Lamar University", "section": "linalg", "type": "Guide", "audience": ["student", "tutor"], "level": "Intermediate", "courses": [], "cost": "Free", "note": "Worked-example notes on first-order equations, second-order linear equations, Laplace transforms, systems, and series solutions, with practice problems.", "start": "", "checked": null, "pick": false},
    {"id": "vmls", "title": "Introduction to Applied Linear Algebra (VMLS)", "url": "https://web.stanford.edu/~boyd/vmls/", "by": "Stephen Boyd and Lieven Vandenberghe", "section": "linalg", "also": ["calcds"], "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro to intermediate", "courses": [], "cost": "Free PDF", "note": "Vectors, matrices, and least squares, taught through applications to data: clustering, regression, and model fitting. A gentle way into matrix algebra with very little proof. Approved by the American Institute of Mathematics.", "start": "Chapters 6–10 for matrix algebra.", "checked": "2026-10-11", "pick": ["linalg", "calcds"]},
    {"id": "openintro-stats", "title": "OpenIntro Statistics", "url": "https://www.openintro.org/book/os/", "by": "Diez, Çetinkaya-Rundel, and Barr", "section": "stats", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["STAT"], "cost": "Free PDF (pay what you want for print)", "note": "One of the most widely used free intro statistics texts, with real data sets, video overviews, and labs in R. Approved by the American Institute of Mathematics.", "start": "", "checked": null, "pick": true},
    {"id": "ims", "title": "Introduction to Modern Statistics", "url": "https://openintro-ims.netlify.app/", "by": "Mine Çetinkaya-Rundel and Johanna Hardin (OpenIntro)", "section": "stats", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["STAT"], "cost": "Free online", "note": "A modern intro text that teaches inference through randomization and bootstrapping before formulas, with an emphasis on data and modeling.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "openstax-stats", "title": "Introductory Statistics 2e", "url": "https://openstax.org/details/books/introductory-statistics-2e", "by": "OpenStax, Rice University", "section": "stats", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["STAT"], "cost": "Free (CC BY)", "note": "A traditional one-term statistics text: descriptive statistics, probability, distributions, confidence intervals, and hypothesis tests.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "seeing-theory", "title": "Seeing Theory", "url": "https://seeing-theory.brown.edu/", "by": "Daniel Kunin, Brown University", "section": "stats", "type": "Interactive", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["STAT"], "cost": "Free", "note": "A visual introduction to probability and statistics in six interactive chapters, from basic probability through regression. Lets you watch the central limit theorem happen.", "start": "Chapter 3, Probability Distributions.", "checked": "2026-10-03", "pick": true},
    {"id": "artofstat", "title": "Art of Stat web apps", "url": "https://www.artofstat.com/web-apps", "by": "Bernhard Klingenberg", "section": "stats", "type": "Interactive", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["STAT"], "cost": "Free", "note": "Free browser apps for exploring data, regression, distributions, sampling distributions, and inference, including bootstrap and permutation tests. Useful when you don't have statistical software.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "statquest", "title": "StatQuest", "url": "https://www.youtube.com/@statquest", "by": "Josh Starmer, YouTube", "section": "stats", "type": "Video", "audience": ["student", "tutor"], "level": "Intro to intermediate", "courses": ["STAT"], "cost": "Free", "note": "Short, friendly videos that explain statistical and machine-learning ideas (p-values, regression, PCA) one picture at a time.", "start": "", "checked": null, "pick": false, "also": ["calcds"]},
    {"id": "jamovi", "title": "jamovi", "url": "https://www.jamovi.org/", "by": "The jamovi project", "section": "stats", "type": "Software", "audience": ["student", "faculty", "staff"], "level": "Intro to intermediate", "courses": ["STAT"], "cost": "Free (open source)", "note": "Point-and-click statistics software, a free alternative to SPSS, built on R. Good for students who need t-tests, ANOVA, or regression without writing code.", "start": "", "checked": null, "pick": false},
    {"id": "r4ds", "title": "R for Data Science (2e)", "url": "https://r4ds.hadley.nz/", "by": "Wickham, Çetinkaya-Rundel, and Grolemund", "section": "data", "type": "Textbook", "audience": ["student", "tutor", "faculty", "staff"], "level": "Intro to intermediate", "courses": ["STAT", "DASC"], "cost": "Free online", "note": "The standard free introduction to doing data analysis in R with the tidyverse: importing, cleaning, visualizing, and summarizing data.", "start": "The \"Whole game\" chapters get you to a working analysis fast.", "checked": "2026-10-03", "pick": ["data"], "also": ["calcds"]},
    {"id": "posit-cloud", "title": "Posit Cloud", "url": "https://posit.cloud/", "by": "Posit", "section": "data", "type": "Tool", "audience": ["student", "faculty", "staff"], "level": "All levels", "courses": ["STAT", "DASC"], "cost": "Free tier (limited hours)", "note": "RStudio in a web browser, so you can run R without installing anything.", "start": "", "checked": null, "pick": false},
    {"id": "py4e", "title": "Python for Everybody", "url": "https://www.py4e.com/", "by": "Charles Severance, University of Michigan", "section": "data", "type": "Course", "audience": ["student", "tutor", "faculty", "staff"], "level": "Foundational", "courses": ["CMSC", "DASC"], "cost": "Free", "note": "A complete beginner's course in Python with a free textbook, video lectures, and auto-graded exercises. Assumes no programming background.", "start": "", "checked": "2026-10-03", "pick": ["data"], "also": ["calcds"]},
    {"id": "colab", "title": "Google Colab", "url": "https://colab.research.google.com/", "by": "Google", "section": "data", "type": "Tool", "audience": ["student", "faculty", "staff"], "level": "All levels", "courses": ["CMSC", "DASC"], "cost": "Free with a Google account", "note": "Python notebooks that run in the browser with common data libraries already installed.", "start": "", "checked": null, "pick": false, "also": ["calcds"]},
    {"id": "mml-book", "title": "Mathematics for Machine Learning", "url": "https://mml-book.github.io/", "by": "Deisenroth, Faisal, and Ong (Cambridge University Press)", "section": "calcds", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intermediate", "courses": [], "cost": "Free PDF", "note": "The linear algebra, vector calculus, probability, and optimization behind machine learning, applied to regression, PCA, and classification. Approved by the American Institute of Mathematics.", "start": "Chapter 5, Vector Calculus, and Chapter 7, Continuous Optimization.", "checked": "2026-10-11", "pick": true},
    {"id": "3b1b-nn", "title": "Neural networks (3Blue1Brown)", "url": "https://www.3blue1brown.com/topics/neural-networks", "by": "Grant Sanderson", "section": "calcds", "type": "Video", "audience": ["student", "tutor", "faculty"], "level": "Intro to intermediate", "courses": [], "cost": "Free", "note": "An animated series on how neural networks learn. Gradient descent is calculus as optimization, and backpropagation is the chain rule at scale.", "start": "The videos on gradient descent and backpropagation calculus.", "checked": null, "pick": true},
    {"id": "carpentries", "title": "Software Carpentry lessons", "url": "https://software-carpentry.org/lessons/", "by": "The Carpentries", "section": "data", "type": "Course", "audience": ["student", "faculty", "staff"], "level": "Foundational", "courses": [], "cost": "Free (CC BY)", "note": "Short, tested lessons on the command line, version control with Git, and programming in Python or R, written for researchers.", "start": "", "checked": null, "pick": false},
    {"id": "excel-ms", "title": "Excel help and learning", "url": "https://support.microsoft.com/en-us/excel", "by": "Microsoft", "section": "data", "type": "Guide", "audience": ["student", "faculty", "staff"], "level": "Foundational to intermediate", "courses": [], "cost": "Free", "note": "Microsoft's official tutorials and video training for Excel, from formulas and charts to PivotTables. Lawrence accounts include Microsoft 365.", "start": "", "checked": null, "pick": false},
    {"id": "excel-gcf", "title": "Excel tutorials (GCFGlobal)", "url": "https://edu.gcfglobal.org/en/excel/", "by": "GCFGlobal / LearnFree", "section": "data", "type": "Course", "audience": ["student", "staff"], "level": "Foundational", "courses": [], "cost": "Free", "note": "Plain-language, step-by-step Excel lessons for complete beginners, with practice files.", "start": "", "checked": null, "pick": true},
    {"id": "hyperphysics", "title": "HyperPhysics", "url": "https://hyperphysics.gsu.edu/hbase/hph.html", "by": "Carl R. Nave, Georgia State University", "section": "sciences", "type": "Guide", "audience": ["student", "tutor"], "level": "Intro", "courses": ["PHYS"], "cost": "Free", "note": "A linked concept map of introductory physics with formulas, diagrams, and worked calculations. Quick for looking up how one idea connects to another.", "start": "", "checked": "2026-10-03", "pick": true},
    {"id": "phet", "title": "PhET Interactive Simulations", "url": "https://phet.colorado.edu/", "by": "University of Colorado Boulder", "section": "sciences", "type": "Interactive", "audience": ["student", "tutor", "faculty"], "level": "Foundational to intro", "courses": ["PHYS", "CHEM", "MATH 103"], "cost": "Free", "note": "Research-based simulations in physics, chemistry, and math (graphing lines, quadratics, fractions, vectors). Good for building intuition before solving problems.", "start": "", "checked": null, "pick": false},
    {"id": "openstax-physics", "title": "University Physics, Volumes 1–3", "url": "https://openstax.org/details/books/university-physics-volume-1", "by": "OpenStax, Rice University", "section": "sciences", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["PHYS"], "cost": "Free (CC BY)", "note": "A calculus-based introductory physics text. Each chapter has worked examples with a \"strategy, solution, significance\" structure.", "start": "", "checked": null, "pick": false},
    {"id": "openstax-chem", "title": "Chemistry 2e", "url": "https://openstax.org/details/books/chemistry-2e", "by": "OpenStax, Rice University", "section": "sciences", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["CHEM"], "cost": "Free (CC BY)", "note": "A general chemistry text. Its appendices on essential math (exponents, logarithms, significant figures) are useful on their own.", "start": "", "checked": null, "pick": false},
    {"id": "chem-libretexts", "title": "Chemistry LibreTexts", "url": "https://chem.libretexts.org/", "by": "LibreTexts", "section": "sciences", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro to advanced", "courses": ["CHEM"], "cost": "Free", "note": "A large library of open chemistry texts and modules, from general chemistry through physical chemistry. Search for a topic rather than browsing.", "start": "", "checked": null, "pick": false},
    {"id": "math-you-need", "title": "The Math You Need, When You Need It", "url": "https://serc.carleton.edu/mathyouneed/index.html", "by": "SERC, Carleton College", "section": "sciences", "type": "Guide", "audience": ["student", "tutor", "faculty"], "level": "Foundational", "courses": ["CHEM", "PHYS", "BIOL", "GEOL"], "cost": "Free", "note": "Short modules on the math that intro science courses assume: unit conversions, rearranging equations, slopes, logarithms, and density, each with practice problems.", "start": "Start with unit conversions and rearranging equations.", "checked": "2026-10-03", "pick": true},
    {"id": "nist-si", "title": "SI units", "url": "https://www.nist.gov/pml/owm/metric-si/si-units", "by": "National Institute of Standards and Technology", "section": "sciences", "type": "Guide", "audience": ["student", "tutor"], "level": "Foundational", "courses": ["CHEM", "PHYS"], "cost": "Free", "note": "The official reference for SI base units, derived units, and prefixes.", "start": "", "checked": null, "pick": false},
    {"id": "openstax-econ", "title": "Principles of Economics 3e", "url": "https://openstax.org/details/books/principles-economics-3e", "by": "OpenStax, Rice University", "section": "social", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["ECON"], "cost": "Free (CC BY)", "note": "A conventional principles text covering micro and macro. The appendix on using graphs in economics is a good refresher on slope and linear equations.", "start": "", "checked": null, "pick": false},
    {"id": "core-econ", "title": "The Economy 2.0 (CORE Econ)", "url": "https://books.core-econ.org/", "by": "The CORE Team", "section": "social", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["ECON"], "cost": "Free online", "note": "A free, data-driven introduction to economics developed by an international group of economists. Uses real data and models throughout.", "start": "", "checked": "2026-10-03", "pick": true},
    {"id": "fred", "title": "FRED economic data", "url": "https://fred.stlouisfed.org/", "by": "Federal Reserve Bank of St. Louis", "section": "social", "type": "Data", "audience": ["student", "faculty", "staff"], "level": "All levels", "courses": ["ECON"], "cost": "Free", "note": "Hundreds of thousands of economic time series (GDP, unemployment, inflation, interest rates) with instant graphs and downloads.", "start": "", "checked": null, "pick": true},
    {"id": "owid", "title": "Our World in Data", "url": "https://ourworldindata.org/", "by": "Global Change Data Lab and University of Oxford", "section": "social", "type": "Data", "audience": ["student", "faculty", "staff"], "level": "All levels", "courses": [], "cost": "Free (CC BY)", "note": "Charts and downloadable data on health, population, energy, poverty, and more, each with its sources documented. Good for projects and for practicing reading graphs.", "start": "", "checked": null, "pick": false},
    {"id": "desmos", "title": "Desmos graphing calculator", "url": "https://www.desmos.com/calculator", "by": "Desmos Studio", "section": "tools", "type": "Tool", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": ["MATH 102", "MATH 103", "MATH 140"], "cost": "Free", "note": "A fast, easy graphing calculator in the browser. Add sliders to see how changing a coefficient changes a graph.", "start": "Type y = a x^2 + b x + c and add sliders for a, b, and c.", "checked": null, "pick": true},
    {"id": "geogebra", "title": "GeoGebra", "url": "https://www.geogebra.org/", "by": "GeoGebra", "section": "tools", "type": "Tool", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": [], "cost": "Free", "note": "Graphing, geometry, 3D, and computer algebra in one free tool, with thousands of ready-made activities.", "start": "", "checked": null, "pick": false, "also": ["geometry"]},
    {"id": "corral-trig", "title": "Trigonometry (Corral)", "url": "https://www.freetechbooks.com/trigonometry-t780.html", "by": "Michael Corral, Schoolcraft College", "section": "geometry", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "Intro", "courses": ["MATH 103"], "cost": "Free (GNU FDL)", "note": "A free, careful trigonometry text that goes well past a precalculus course: general triangles and the laws of sines and cosines, identities, radian measure, graphing, inverse functions, and complex numbers.", "start": "The chapter on general triangles: laws of sines and cosines.", "checked": "2026-10-11", "pick": true},
    {"id": "euclid-joyce", "title": "Euclid's Elements (David Joyce's edition)", "url": "https://mathcs.clarku.edu/~djoyce/java/elements/elements.html", "by": "David E. Joyce, Clark University", "section": "geometry", "type": "Textbook", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": [], "cost": "Free", "note": "The full Elements online, with a diagram and a short modern commentary for every proposition. The classic place to learn plane geometry and proof together.", "start": "Book I, propositions 1–48, ending with the Pythagorean theorem.", "checked": "2026-10-11", "pick": true},
    {"id": "wolframalpha", "title": "Wolfram|Alpha", "url": "https://www.wolframalpha.com/", "by": "Wolfram Research", "section": "tools", "type": "Tool", "audience": ["student", "tutor"], "level": "All levels", "courses": [], "cost": "Free (step-by-step solutions are paid)", "note": "Answers math questions typed in plain language: solves equations, simplifies, differentiates, integrates, and plots. Best for checking your work after you've done it.", "start": "", "checked": null, "pick": false},
    {"id": "learning-scientists", "title": "Six strategies for effective learning", "url": "https://www.learningscientists.org/downloadable-materials", "by": "The Learning Scientists", "section": "study", "type": "Handout", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": [], "cost": "Free for educational use (CC BY-NC-ND)", "note": "Posters, slides, and bookmarks on six research-backed strategies: spaced practice, retrieval practice, elaboration, interleaving, concrete examples, and dual coding.", "start": "Read the retrieval practice and interleaving posters first; they matter most for math.", "checked": "2026-10-03", "pick": true},
    {"id": "retrieval-practice", "title": "Retrieval practice for students", "url": "https://www.retrievalpractice.org/students", "by": "Pooja K. Agarwal", "section": "study", "type": "Guide", "audience": ["student", "tutor"], "level": "All levels", "courses": [], "cost": "Free", "note": "Short, research-based advice on studying by recalling and practicing instead of rereading.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "youcubed", "title": "youcubed", "url": "https://www.youcubed.org/", "by": "Stanford Graduate School of Education", "section": "study", "type": "Guide", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": [], "cost": "Free", "note": "Resources on mathematical mindset and visual approaches to math. Helpful reading for students who believe they are \"not a math person,\" and for the people who teach them.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "overleaf-30", "title": "Learn LaTeX in 30 minutes", "url": "https://www.overleaf.com/learn/latex/Learn_LaTeX_in_30_minutes", "by": "Overleaf", "section": "writing", "type": "Guide", "audience": ["student", "tutor", "faculty"], "level": "Foundational", "courses": [], "cost": "Free (Overleaf has a free plan)", "note": "The standard first tutorial for typesetting math with LaTeX in an online editor. The rest of Overleaf's documentation answers almost any later question.", "start": "", "checked": "2026-10-03", "pick": true},
    {"id": "serc-quant-writing", "title": "Quantitative writing", "url": "https://serc.carleton.edu/sp/carl_ltc/quantitative_writing/index.html", "by": "SERC, Carleton College", "section": "writing", "type": "Guide", "audience": ["student", "faculty"], "level": "All levels", "courses": [], "cost": "Free", "note": "What it means to write with numbers, with tutorials and examples of quantitative writing assignments across disciplines.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "cmu-handouts", "title": "Communication handouts, including data visualization", "url": "https://www.cmu.edu/student-success/other-resources/handouts/index.html", "by": "Carnegie Mellon University, Student Academic Success Center", "section": "writing", "type": "Handout", "audience": ["student", "tutor", "faculty"], "level": "All levels", "courses": [], "cost": "Free", "note": "Printable handouts on scientific writing, presentations, research posters, tables and charts, and data visualization.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "gre-prep", "title": "Official GRE prep materials", "url": "https://www.ets.org/gre/test-takers/general-test/prepare/prep-books-services.html", "by": "ETS", "section": "beyond", "type": "Guide", "audience": ["student"], "level": "Intermediate", "courses": [], "cost": "Free practice tests (some materials paid)", "note": "Free official practice tests and a math review for the GRE quantitative section, from the test maker.", "start": "", "checked": "2026-10-03", "pick": true},
    {"id": "openstax-contemp", "title": "Contemporary Mathematics", "url": "https://openstax.org/details/books/contemporary-mathematics", "by": "OpenStax, Rice University", "section": "beyond", "type": "Textbook", "audience": ["student", "faculty"], "level": "Foundational", "courses": ["Q courses"], "cost": "Free (CC BY)", "note": "A liberal-arts math text on sets, logic, probability, statistics, personal finance, and geometry. Good for quantitative reasoning outside a math major.", "start": "The personal finance chapter covers interest, loans, and budgeting.", "checked": "2026-10-03", "pick": false, "lu": true},
    {"id": "math-in-society", "title": "Math in Society", "url": "https://textbooks.aimath.org/textbooks/approved-textbooks/lippman/", "by": "David Lippman", "section": "beyond", "type": "Textbook", "audience": ["student", "faculty"], "level": "Foundational", "courses": ["Q courses"], "cost": "Free", "note": "Short chapters on voting, apportionment, finance, growth models, statistics, and graph theory as they come up in civic life.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "crla-ittpc", "title": "CRLA tutor training certification (ITTPC)", "url": "https://www.crla.net/index.php/certifications/ittpc-international-tutor-training-program", "by": "College Reading and Learning Association", "section": "tutoring", "type": "Organization", "audience": ["tutor", "staff"], "level": "All levels", "courses": [], "cost": "Free to read", "note": "The standards the QRC trains to. Level 1 requires at least 10 hours of training on 8 topics and 25 hours of tutoring. Certification goes to programs, not individual tutors.", "start": "Read the Level 1 topics list to see what your training covers.", "checked": "2026-10-03", "pick": true},
    {"id": "qmasc-training", "title": "QMaSC Handbook: training and mentoring chapters", "url": "https://digitalcommons.usf.edu/qmasc_handbook/", "by": "Coulombe, O'Neill, and Schuckers, eds.", "section": "tutoring", "type": "Guide", "audience": ["tutor", "staff"], "level": "All levels", "courses": [], "cost": "Free (CC BY-NC-ND)", "note": "Chapters 14 and 15 of this handbook collect training methods and practice scenarios written by directors of math and quantitative centers at peer colleges.", "start": "Chapter 15, Practice and Mentoring, is a bank of tutoring scenarios.", "checked": "2026-10-03", "pick": false},
    {"id": "serc-qr", "title": "Developing quantitative reasoning", "url": "https://serc.carleton.edu/sp/library/qr/index.html", "by": "Nathan Grawe, SERC, Carleton College", "section": "teaching", "type": "Guide", "audience": ["faculty"], "level": "All levels", "courses": [], "cost": "Free", "note": "How to build quantitative reasoning into a course in any discipline: what QR is, principles for teaching it, designing assignments, and assessing them with rubrics.", "start": "", "checked": "2026-10-03", "pick": true},
    {"id": "maa-ipg", "title": "MAA Instructional Practices Guide", "url": "https://maa.org/resources/instructional-practices-guide/", "by": "Mathematical Association of America", "section": "teaching", "type": "Guide", "audience": ["faculty", "tutor"], "level": "All levels", "courses": [], "cost": "Free (CC BY-NC)", "note": "An evidence-based guide to classroom practices, assessment, and course design in college mathematics, with a companion book-study guide.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "aim-otl", "title": "AIM approved open textbooks", "url": "https://textbooks.aimath.org/textbooks/approved-textbooks/", "by": "American Institute of Mathematics", "section": "teaching", "type": "Guide", "audience": ["faculty"], "level": "All levels", "courses": [], "cost": "Free", "note": "A reviewed list of free math textbooks from precalculus through upper-division courses. Start here if you want to drop a commercial textbook.", "start": "", "checked": "2026-10-03", "pick": true},
    {"id": "ssac", "title": "Teaching with Spreadsheets Across the Curriculum", "url": "https://serc.carleton.edu/sp/ssac/index.html", "by": "SERC, Carleton College", "section": "teaching", "type": "Guide", "audience": ["faculty", "staff"], "level": "All levels", "courses": [], "cost": "Free", "note": "Ready-made modules in which students build Excel spreadsheets to answer questions in subjects from geology to economics.", "start": "", "checked": "2026-10-03", "pick": false},
    {"id": "qmasc-handbook", "title": "QMaSC: A Handbook for Directors of Quantitative and Mathematics Support Centers", "url": "https://digitalcommons.usf.edu/qmasc_handbook/", "by": "Coulombe, O'Neill, and Schuckers, eds. (2016)", "section": "centers", "type": "Guide", "audience": ["staff", "faculty"], "level": "All levels", "courses": [], "cost": "Free (CC BY-NC-ND)", "note": "The handbook for this field: management, outreach, faculty development, training, assessment, space design, and ten case studies of centers at colleges like Bates, Hamilton, Smith, and St. Lawrence.", "start": "Chapters 9 (outreach) and 12 (virtual presence) shaped this directory.", "checked": "2026-10-03", "pick": true},
    {"id": "numeracy", "title": "Numeracy (journal)", "url": "https://digitalcommons.usf.edu/numeracy/", "by": "National Numeracy Network", "section": "centers", "type": "Organization", "audience": ["faculty", "staff"], "level": "All levels", "courses": [], "cost": "Free (open access)", "note": "The peer-reviewed, open-access journal on quantitative literacy across disciplines.", "start": "", "checked": "2026-10-03", "pick": false}
  ]
}
;
