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
nmsq[u_] := u.u
nm[u_] := Sqrt[nmsq[u]]
rho[X_]:=Min[nmsq[#1-#2]&@@@Subsets[X,{2}]]//Sqrt
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

		a[3]= 
			Module[{},
				v1={1,0,0};

				{v1, RotationMatrix[2Pi/3,{0,0,1}].v1, RotationMatrix[-2Pi/3,{0,0,1}].v1}
			];

		a[4]=
			Module[{},
				v1={0,0,1};
				v2={x,0,z};
				v3={x1,y1,z};
				v4={x2,y2,z};

				{v1,v2,v3,v4}/.{x->(2 Sqrt[2])/3,z->-(1/3),x1->-(Sqrt[2]/3),y1->Sqrt[2/3],x2->-(Sqrt[2]/3),y2->-Sqrt[(2/3)],t->8/3}
			];


		a[5]=
			Module[{},
				v1 = {0,0,1};
				v2={x,0,z};
				v3={0,y,z};
				v4={-x,0,z};
				v5={0,-y,z};

				{v1,v2,v3,v4,v5}/.{x->1,y->1,z->0,t->2}
			];

		a[6]={{}}

		a[7]= 
			Module[{},

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
		a[8];
		a[9];
		a[10];
		a[11];
		a[12];
		a[13];
		a[14];
		a[24];

		a[N]
	];



TetPoints[th_]:= Module[{},

z[t_]:=Sqrt[1-t^2];

{
{0,th,z[th]},
{0,-th,z[th]},
{th,0,-z[th]},
{-th,0,-z[th]}
}

]



(*Spherical Point Sets:Transformations & Flows*)

DiscreteRadiusFlow[X_,ep_,del_]:=
	Module[{},
		rho = Min[nmsq[#1-#2]&@@@Subsets[X,{2}]];
		pointflowatvfromw[v_,w_,epsilon_] := If [(rho*(1-epsilon))<nmsq[v-w]<(rho*(1 + epsilon))&&v != {0,0,1}, (v-w), {0,0,0}];
		totalpointflowatv[v_,epsilon_] := del*Total[pointflowatvfromw[v,#,epsilon]&/@X];

		Normalize/@(X+(totalpointflowatv[#,ep]&/@X))//N
	];




evolve[X_,steps_,ep_,del_]:=Block[{},
Nest[DiscreteRadiusFlow[#,ep,del]&,X ,steps]
];


JitteredDiscreteRadiusFlow[X_,ep_,del_]:=
	Module[{},
		unipoint[u_,t_]:= {Sqrt[1-u^2]Cos[t],Sqrt[1-u^2]Sin[t],u};
		randomset[k_]:= Table[unipoint[RandomReal[{-1,1}], RandomReal[{0,2Pi}]],{i,k}];
		rho = Min[nmsq[#1-#2]&@@@Subsets[X,{2}]];
		pointflowatvfromw[v_,w_,epsilon_] := If [(rho*(1-epsilon))<nmsq[v-w]<(rho*(1 + epsilon))&&v != {0,0,1}, (v-w), {0,0,0}];
		totalpointflowatv[v_,epsilon_] := del*Total[pointflowatvfromw[v,#,epsilon]&/@X];

		Normalize/@((Normalize/@(X+(totalpointflowatv[#,ep]&/@X))//N )+ ep*randomset[Length[X]])
	]

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







(*Functions*)

Discrepancy[XX_]:=
Module[{},
NMSQ[u_]:=u.u;
NM[u_]:=Sqrt[u.u] ;
NTups[X_,n_]:=Subsets[X,{n}];

(*Triples*)
CRS[u_,v_]:={u[[2]]v[[3]]-u[[3]]v[[2]], u[[3]]v[[1]]-u[[1]]v[[3]],u[[1]]v[[2]]-v[[1]]u[[2]]};
CRS::usage="CRS[u, v] computes the cross product of u and v";

VNMal[u_,v_,w_]:=CRS[u-w,v-w]/NM[CRS[u-w,v-w]];
VNMal::usage="VNMal[u, v, w] computes a unit normal vector to the plane defined by the points u, v and w.";

DiracCounter31[x_,u_,v_,w_]:=If[Dot[VNMal[u,v,w],u]<Dot[VNMal[u,v,w],x], 1,0];
DiracCounter31::usage="DiracCounter31[x, u, v, w] assigns a value of 1 to a point x if it falls within the OPEN cap defined by u, v and w and the choice of unit normal, 0 otherwise.";

DiracCounter32[x_,u_,v_,w_]:=If[Dot[VNMal[u,v,w],u]<=Dot[VNMal[u,v,w],x], 1,0];
DiracCounter32::usage="DiracCounter32[x, u, v, w] assigns a value of 1 to a point x if it falls within the CLOSED cap defined by u, v and w and the choice of unit normal, 0 otherwise.";

SigmaCounter31[u_,v_,w_] :=(1-Dot[VNMal[u,v,w],u])/2;
SigmaCounter31::usage="SigmaCounter31[x, u, v, w] computes the normalized area of the cap defined by u, v and w and the choice of unit normal.";

LocalDis31[X_,u_,v_,w_]:=
Abs[NMSQ[Map[DiracCounter31[#,u,v,w]&,X]]/Length[X]-SigmaCounter31[u,v,w]];
LocalDis31::usage="LocalDis31[X, u, v, w] computes the discrepancy of a point set X with respect to the OPEN cap defined by u, v and w and the choice of unit normal.";

LocalDis32[X_,u_,v_,w_]:=
Abs[NMSQ[Map[DiracCounter32[#,u,v,w]&,X]]/Length[X]-SigmaCounter31[u,v,w]];
LocalDis32::usage="LocalDis32[X, u, v, w] computes the discrepancy of a point set X with respect to the CLOSED cap defined by u, v and w and the choice of unit normal.";

Dis31[X_]:=Map[LocalDis31[X,#[[1]],#[[2]],#[[3]]]&,NTups[X,3]];
Dis31::usage="Dis31[X] computes the discrepancy of a point set X with respect to all OPEN caps defined by triples of points in X and a choice of unit normal.";

Dis32[X_]:=Map[LocalDis32[X,#[[1]],#[[2]],#[[3]]]&,NTups[X,3]];
Dis32::usage="Dis32[X] computes the discrepancy of a point set X with respect to all CLOSED caps defined by triples of points in X and a choice of unit normal.";


Dis33[X_]:= {Max[Map[
Max[
LocalDis31[X,#[[1]],#[[2]],#[[3]]],
LocalDis32[X,#[[1]],#[[2]],#[[3]]]
]&,
NTups[X,3]
]]};

(*Pairs*)
LNMal[u_,v_]:=(u+v)/NM[u+v];
VNMal::usage="VNMal[u, v] computes a unit normal vector to the plane defined by the points u, v when they are diametrically opposed in a cap.";

DiracCounter21[x_,u_,v_]:=If[NM[u+v]==0,0,If[Dot[LNMal[u,v],u]<Dot[LNMal[u,v],x], 1,0]];
DiracCounter21::usage="DiracCounter21[x, u, v] assigns a value of 1 to a point x if it falls within the OPEN cap defined by u and v being diametrically opposed and the choice of unit normal, 0 otherwise.";

DiracCounter22[x_,u_,v_]:=If[NM[u+v]==0,0,If[Dot[LNMal[u,v],u]<=Dot[LNMal[u,v],x], 1,0]];
DiracCounter22::usage="DiracCounter22[x, u, v] assigns a value of 1 to a point x if it falls within the CLOSED cap defined by u and v being diametrically opposed and the choice of unit normal, 0 otherwise.";

SigmaCounter21[u_,v_] :=If[NM[u+v]==0,0,(1-Dot[LNMal[u,v],u])/2];
SigmaCounter21::usage=
"SigmaCounter21[x, u, v] computes the normalized area of the cap defined by u and v being diametrically opposed and the choice of unit normal.";

LocalDis21[X_,u_,v_]:=
Abs[NMSQ[Map[DiracCounter21[#,u,v]&,X]]/Length[X]-SigmaCounter21[u,v]];
LocalDis21::usage="LocalDis21[X, u, v] computes the discrepancy of a point set X with respect to the OPEN cap defined by u and v being diametrically opposed and the choice of unit normal.";

LocalDis22[X_,u_,v_]:=
Abs[NMSQ[Map[DiracCounter22[#,u,v]&,X]]/Length[X]-SigmaCounter21[u,v]];
LocalDis22::usage="LocalDis22[X, u, v] computes the discrepancy of a point set X with respect to the CLOSED cap defined by u and v being diametrically opposed and the choice of unit normal.";

Dis21[X_]:=Map[LocalDis21[X,#[[1]],#[[2]]]&,NTups[X,2]];
Dis21::usage="Dis21[X] computes the discrepancy of a point set X with respect to all OPEN caps defined by diametrically opposed pairs of points in X and a choice of unit normal.";


Dis22[X_]:=Map[LocalDis22[X,#[[1]],#[[2]]]&,NTups[X,2]];
Dis22::usage="Dis21[X] computes the discrepancy of a point set X with respect to all CLOSED caps defined by diametrically opposed pairs of points in X and a choice of unit normal.";

S2InftyDisInit[X_]:=Max[Join[Dis22[X],Dis21[X],Dis31[X],Dis32[X],{1/Length[X]}]];
S2InftyDis[X_]:=Max[Join[Dis22[X],Dis21[X],Dis33[X],{1/Length[X]}]];
S2InftyDis::usage="SwInftyDis[X] computes the maximum discrepancy of the point set X with respect to the caps that are anchored by triples, pairs and singltons in X.  This equal to the S2 L-Infinity discrepancy of the set X.";
S2InftyDisN[X_]:=Max[Join[Dis22[N[X]],Dis21[N[X]],Dis31[N[X]],Dis32[N[X]],{1/Length[N[X]]}]];

S2InftyDisN[XX]

]











End[]
EndPackage[]
