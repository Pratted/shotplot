import math
import numpy as np

"""
Stores x,y,z coordinates of a position.
"""
class Vector:
    def __init__(self, x=0, y=0, z=0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
        
    def __sub__(self, rhs):
        return Vector(self.x - rhs.x, self.y - rhs.y, self.z - rhs.z)
        
    def length(self):
        return math.sqrt(self.x ** 2 + self.y ** 2 + self.z ** 2)

"""
Source: http://www.pgatour.com/etc/designs/pgatour-site/clientlibs/theme-pgatour-js-embedded.min.js
"""
def plot(pos, hole, height, width):
    DEG_TO_RAD = math.pi / 180
    PI_OVER_TWO = math.pi / 2
    
    w = Vector(hole["camera_x"], hole["camera_y"], hole["camera_z"])
    k = pos
    target = Vector(hole["target_x"], hole["target_y"], hole["target_z"])
            
    k = k - target
    w = w - target
    
    F = math.atan2(w.y, w.x)
    y = math.asin(w.z / w.length())
    
    q = PI_OVER_TWO - y
    o = PI_OVER_TWO + F
    
    r = float(hole["roll"]) * DEG_TO_RAD
    
    z = np.identity(3)
    D = math.cos(r)
    J = math.sin(r)
    
    z[0][0] = D
    z[0][1] = J
    z[1][0] = J * -1
    z[1][1] = D
    
    u = np.identity(3)
    x = math.cos(o)
    G = math.sin(o)
    
    u[0][0] = x
    u[0][1] = G
    u[1][0] = G * -1
    u[1][1] = x

    m = np.identity(3)
    
    n = math.cos(q)
    t = math.sin(q)
    
    m[1][1] = n
    m[1][2] = t
    m[2][1] = t * -1
    m[2][2] = n
    
    H = np.dot(z, np.dot(m,u))
    I = np.linalg.inv(H)
    
    E = k.x * I[0][0] + k.y * I[1][0] + k.z * I[2][0]
    C = k.x * I[0][1] + k.y * I[1][1] + k.z * I[2][1]
    B = k.x * I[0][2] + k.y * I[1][2] + k.z * I[2][2]
    
    d = Vector(E,C,B)
    
    s = w.z - d.z
    p = (height * .5) / math.tan((float(hole["fov"]) * DEG_TO_RAD) * .5)
    f = p / s
    c = width * .5 + d.x * f
    k = height * .5 - d.y * f
    
    return [c, k]



if __name__ == "__main__":
    plotter = {}
    plotter["camera"] = {}
    plotter["target"] = {}
        
    tee_position = Vector(9587.283,10705.988,349.427)
    hole = {
            "hole_id": 1,
            "hole_lens": "43.456",
            "hole_fov": "21.292",
            "hole_roll": "327.447",
            "hole_camera_x": "9785.422",
            "hole_camera_y": "10880.321",
            "hole_camera_z": "2162.569",
            "hole_target_x": "9794.300",
            "hole_target_y": "10876.827",
            "hole_target_z": "496.709",
            "green_lens": "43.456",
            "green_fov": "21.292",
            "green_roll": "-84.043",
            "green_camera_x": "9472.979",
            "green_camera_y": "10377.564",
            "green_camera_z": "555.880",
            "green_target_x": "9473.136",
            "green_target_y": "10377.812",
            "green_target_z": "494.347",
            "round_rank": "12",
            "event_rank": "12",
    }
    
    plot(tee_position, hole, 120, 265)
      
    
    
    print "Done"