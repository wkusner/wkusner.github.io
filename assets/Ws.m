(* ::Package:: *)

BeginPackage["Ws`"]

(*
This package is a partial compilation of functions related to work done at the University of Pittsburgh and 
Graz University of Technology between 2009 and 2016 (so far).  The intent is the harvest, document, and sew 
some of these scattered seeds.
	-Woden Kusner
*)

nmsq::usage =
	"simple norm squared via dot product computation";
nm::usage =
	"simple norm via square root of dot product computation";


UniformPoints::usage =
	"Generates uniformly distributed points on the two-sphere, options include: the number of points, the dimension and the seed";
SpiralPoints::usage =
	"Generates spiral points on the two-sphere, options include: the number of points, the choice of irrational rotaiton";
CFSpiralPoints::usage =
	"uses continued fraction to give rational spiral points"
FibonacciPoints::usage =
	"Generates rational spiral Fibonacci points on the two-sphere";
DeterminentalPoints::usage = 
	"Generates points from the spherical ensemble";
HeckePoints::usage =
	"Generates points on the two-sphere according to the specific irrational rotation construction of Lubotzky-Phillips-Sarnak";


TammesPoints::usage = 
	"Calls know Tammes points from a table";


ShowMePoints::usage =
	"Shows Points from a spherical point set";
ShowMeContactGraph::usage =
	"Shows Contact graph of a spherical point set with distance within epsilon of the minimal straight line distance options include: the point set,
	the error epsilon, the color of the lines";




Begin["`Private`"]


(*Useful Basic Functions*)
(*clearvariables:=*)
nmsq[u_]:=u.u
nm[u_]:=Sqrt[nmsq[u]]
(*rotation:=
randomrotation:=*)
(*http://planning.cs.uiuc.edu/node198.html*)




(*Spherical Point Sets: Generating*)
(*UniformPoints[k_]:=
Module[{},
unipoint[u_,t_]:={Sqrt[1-u^2]Cos[t],Sqrt[1-u^2]Sin[t],u};
Table[unipoint[RandomReal[{-1,1}], RandomReal[{0,2Pi}]],{i,k}]
];*)

UniformPoints[N_,dim_:2,seed_:{}]:=
	Module[{},
		SeedRandom[seed];
		random[n_]:=
			Module[{x},
				x=RandomVariate[NormalDistribution[],n];
				x/Norm[x]
			];
	Table[random[dim+1],{i,N}]
	];

CFSpiralPoints[N_, irr_]:=
	Module[{},
	lambert[x_,y_]:={2Sqrt[y-y^2]Cos[2\[Pi] x],2Sqrt[y-y^2]Sin[2\[Pi] x],1-2y};
		latticepoints[n_,ir_]:=
			Module[{r,d},
				r=FromContinuedFraction[ContinuedFraction[ir, n]];
				d=Denominator[r];
				Table[{k/d,FractionalPart[k r]},{k,0,d-1}]
			];
		Z=latticepoints[N,irr];
		lambert[#[[1]],#[[2]]]&/@Z
	];

FibonacciPoints[N_]:=
	Module[{},
		lambert[x_,y_]:={2Sqrt[y-y^2]Cos[2\[Pi] x],2Sqrt[y-y^2]Sin[2\[Pi] x],1-2y};
		fibonaccilattice[n_]:=
			Module[{Fn,r},
				Fn=Fibonacci[n];
				r=Fibonacci[n-1]/Fn;
				Table[{k/Fn,FractionalPart[k r]},{k,0,Fn-1}]
			];
		lambert[#[[1]],#[[2]]]&/@fibonaccilattice[N]
	];



SpiralPoints[n_,irr_]:=Module[{r},
r=irr;
Z=Table[{k/n,FractionalPart[k r]},{k,0,n-1}];
lambert[x_,y_]:={2Sqrt[y-y^2]Cos[2\[Pi] x],2Sqrt[y-y^2]Sin[2\[Pi] x],1-2y};
lambert[#[[1]],#[[2]]]&/@Z
];



HeckePoints[N_,bool_:{}]:=
	Module[{},
		a[0] = RotationMatrix[ArcCos[-3/5],{1,0,0}];
		a[1] = RotationMatrix[ArcCos[-3/5],{0,1,0}];
		a[2] = RotationMatrix[ArcCos[-3/5],{0,0,1}];
		Map[Dot[#,RotationMatrix[2,{1,1,1}].{0,1,0}]&,Table[Apply[Dot,a/@IntegerDigits[i,3]],{i,1,N}]]
	];

DeterminentalPoints[N_]:=
	Module[{},
		randomeigenvalues[n_]:= Inverse[RandomVariate[NormalDistribution[],{n,n}]].RandomVariate[NormalDistribution[],{n,n}]//Eigenvalues;
		stereographicprojection[{x_}]:= {(2 Re[x])/(1+Re[x]^2+Im[x]^2),(2 Im[x])/(1+Re[x]^2+Im[x]^2),(-1+Re[x]^2+Im[x]^2)/(1+Re[x]^2+Im[x]^2)};
		stereographicprojection[{#}]&/@randomeigenvalues[N]
	];


(*GraphRealizer:=;*)

(*JitteredPoints:=;*)


(*Spherical Point Sets:Hashed*)

(*NRing
Simplex
CrossPolytope
RootSystem
*)

TammesPoints[N_]:= 
	Module[{},
		a[1]={{0,0,1}};
		a[2]={{0,0,1},{0,0,-1}};
		a[3]= Module[{},
			v1={1,0,0};
			{v1, RotationMatrix[2Pi/3,{0,0,1}].v1, RotationMatrix[-2Pi/3,{0,0,1}].v1}];
		a[4]=
			Module[{},
				v1={0,0,1};
				v2={x,0,z};
				v3={x1,y1,z};
				v4={x2,y2,z};
				{v1,v2,v3,v4}/.{x->(2 Sqrt[2])/3,z->-(1/3),x1->-(Sqrt[2]/3),y1->Sqrt[2/3],x2->-(Sqrt[2]/3),y2->-Sqrt[(2/3)],t->8/3}
			];


		a[5]=Module[{},

			v1 = {0,0,1};
			v2={x,0,z};
			v3={0,y,z};
			v4={-x,0,z};
			v5={0,-y,z};

				{v1,v2,v3,v4,v5}/.{x->1,y->1,z->0,t->2}
			];


			a[7]= Module[{},

					v1 = {a,0,z};
					v2=RotationMatrix[2Pi/3,{0,0,1}].v1;
					v3=RotationMatrix[4Pi/3,{0,0,1}].v1;;
					v4={-b,0,z2};
					v5=RotationMatrix[2Pi/3,{0,0,1}].v4;
					v6=RotationMatrix[4Pi/3,{0,0,1}].v4;
					v7={0,0,-1};

					{v1,v2,v3,v4,v5,v6,v7}/.{a->(-(16/9) (-1)^(1/4) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3))+(16 (-1)^(3/4) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3)))/(3 3^(1/6) (1/2 (-3+I Sqrt[3]))^(2/3))+(16 (-1)^(3/4) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3)))/(3^(5/6) (1/2 (-3+I Sqrt[3]))^(1/3))-(8 (-1)^(3/4) 3^(1/6) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3)))/(1/2 (-3+I Sqrt[3]))^(1/3)+4/3 (-1)^(1/4) (2/3)^(2/3) (-3+I Sqrt[3])^(1/3) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3))+1/(3 3^(1/6)) 4 (-1)^(3/4) 2^(2/3) (-3+I Sqrt[3])^(1/3) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3))+8/9 (-1)^(1/4) (2/3)^(1/3) (-3+I Sqrt[3])^(2/3) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3))-1/(3 3^(5/6)) 8 (-1)^(3/4) 2^(1/3) (-3+I Sqrt[3])^(2/3) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3))+(16 (-1)^(1/4) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3)))/(3 (3/2 (-3+I Sqrt[3]))^(2/3))+(8 (-1)^(1/4) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3)))/(3 (3/2 (-3+I Sqrt[3]))^(1/3)))/((8 I 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)-4 (2/3)^(2/3) (-3+I Sqrt[3])^(1/3)-(4 I 2^(2/3) (-3+I Sqrt[3])^(1/3))/3^(1/6)-8/(3/2 (-3+I Sqrt[3]))^(1/3)),b->1/3 (-1)^(1/4) \[Sqrt](24 I-(6 I 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(6 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(18 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)+(6 I 3^(2/3))/(1/2 (-3+I Sqrt[3]))^(1/3)-3 2^(2/3) 3^(5/6) (-3+I Sqrt[3])^(1/3)-3 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)+3 I 2^(2/3) (3 (-3+I Sqrt[3]))^(1/3)-I 2^(1/3) (3 (-3+I Sqrt[3]))^(2/3)),z->1/6 (-2+(2 3^(1/3))/(1/2 (-3+I Sqrt[3]))^(2/3)+(2 I 3^(5/6))/(1/2 (-3+I Sqrt[3]))^(2/3)+(2/3)^(1/3) (-3+I Sqrt[3])^(2/3)-I 2^(1/3) 3^(1/6) (-3+I Sqrt[3])^(2/3)),z2->-1-(1-I Sqrt[3])/(3/2 (-3+I Sqrt[3]))^(1/3)-((1/2 (-3+I Sqrt[3]))^(1/3) (1+I Sqrt[3]))/3^(2/3),t->(2 I 3^(1/6))/(1/2 (-3+I Sqrt[3]))^(1/3)-(2/3)^(2/3) (-3+I Sqrt[3])^(1/3)-(I 2^(2/3) (-3+I Sqrt[3])^(1/3))/3^(1/6)-2/(3/2 (-3+I Sqrt[3]))^(1/3)}
					(*{Root[-1-#1+3 #1^3+2 #1^4-2 #1^6+#1^7+2 #1^9+#1^10+2 #1^11&,1],Root[1+#1^4+2 #1^5+#1^8-#1^9-3 #1^14-2 #1^15-3 #1^16+#1^17+#1^18+#1^20&,3],Root[-1-9 #1+9 #1^2+9 #1^3&,3],Root[-1-3 #1+9 #1^2+3 #1^3&,2],Root[64-48 #1+3 #1^3&,2]}*)


];

		a[N]
	];



(*Spherical Point Sets:Transformations & Flows*)

(*Spherical Point Sets:Analysis*)

(*Spherical Point Sets:Graphics*)

ShowMePoints[X_]:=
	Graphics3D[{PointSize[Medium],Point@X,Opacity[.5], Sphere[{0,0,0},1]}, Boxed->False,ImageSize->Medium];

(*ShowMeCaps[X_,r_]:=Module[{},1];*)

ShowMeContactGraph[X_,epsilon_:0,linecolor_:Black]:=
	Module[{},
		nmsq[u_]=u.u;
		rholist[S_]:=nmsq[#1-#2]&@@@Subsets[S,{2}];
		Z=Min[rholist[X]]+epsilon;
		Graphics3D[{PointSize[Medium], Point@X, linecolor, Line/@Select[Subsets[X,{2}], nmsq[#1-#2]&@@#<= Z&], Opacity[0.5],White,Sphere[{0,0,0},1]
		},Boxed->False,ImageSize->Medium,ViewPoint->{0,0,10}]
	];


(*the colored graphs from peter and johann*)







End[]
EndPackage[]
