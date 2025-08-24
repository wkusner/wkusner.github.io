CC = gcc
CFLAGS = -std=c99 -O3 #-Wall -g
LFLAGS = -lm
CSOURCES = point3d.o scap.o discrep.o

all: $(CSOURCES) 
	$(CC) -o discrep $(LFLAGS) $(CSOURCES)

point3d.o: point3d.c point3d.h
	$(CC) $(CFLAGS) -c point3d.c

scap.o: scap.c scap.h
	$(CC) $(CFLAGS) -c scap.c

discrep.o: discrep.c point3d.h scap.h 
	$(CC) $(CFLAGS) -c discrep.c

clean:
	rm *.o
	rm discrep