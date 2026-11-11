from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates, zoom, sobel
from PIL import Image

def gray(a):
 rgb=a[...,:3]/255.;alpha=a[...,3:4]/255.
 rgb=rgb*alpha+np.array([.11,.19,.15])*(1-alpha)
 return (rgb*np.array([.299,.587,.114])).sum(2).astype('float32')
def sample(a,u,v):
 y,x=np.mgrid[:a.shape[0],:a.shape[1]]
 if a.ndim==2:return map_coordinates(a,[y+v,x+u],order=1,mode='nearest')
 return np.stack([map_coordinates(a[...,k],[y+v,x+u],order=1,mode='constant',cval=0) for k in range(a.shape[2])],2)
def flow(a,b):
 # Pyramidal, regularized dense Lucas-Kanade; all fields describe source -> target.
 a=gray(a);b=gray(b);u=v=None
 for scale in [.25,.5,1.]:
  x=zoom(a,scale,order=1);y=zoom(b,scale,order=1)
  if u is None:u=np.zeros_like(x);v=np.zeros_like(x)
  else:
   factor=x.shape[0]/u.shape[0];u=zoom(u,factor,order=1)*factor;v=zoom(v,factor,order=1)*factor
  for it in range(5):
   warped=sample(y,u,v);gx=sobel(warped,axis=1)/8;gy=sobel(warped,axis=0)/8;dt=x-warped
   aa=gaussian_filter(gx*gx,2)+.00015;bb=gaussian_filter(gx*gy,2);cc=gaussian_filter(gy*gy,2)+.00015
   dd=gaussian_filter(gx*dt,2);ee=gaussian_filter(gy*dt,2);det=aa*cc-bb*bb
   du=(cc*dd-bb*ee)/det;dv=(aa*ee-bb*dd)/det
   u=gaussian_filter(u+np.clip(du,-1.,1.)*.65,.8);v=gaussian_filter(v+np.clip(dv,-1.,1.)*.65,.8)
 return np.stack([u,v],2)
def tween(a,b,forward,backward,t):
 # Warp both endpoints toward the intermediate geometry, then combine premultiplied color.
 x=a.astype('float32')/255;y=b.astype('float32')/255
 x[...,:3]*=x[...,3:4];y[...,:3]*=y[...,3:4]
 x=sample(x,-forward[...,0]*t,-forward[...,1]*t)
 y=sample(y,-backward[...,0]*(1-t),-backward[...,1]*(1-t))
 rgba=x*(1-t)+y*t
 rgba[...,:3]/=np.maximum(rgba[...,3:4],1e-5)
 return np.uint8(np.clip(rgba*255,0,255))

def translated_test():
 a=np.zeros((64,64,4),dtype=np.uint8);a[20:42,16:37]=[230,130,60,255];b=np.zeros_like(a);b[:,5:]=a[:,:-5]
 f=flow(a,b);mean=np.median(f[24:38,20:33,0]);print('translation flow median',float(mean));assert abs(mean-5)<1.5

if __name__=='__main__':translated_test()
