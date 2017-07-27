import xml.etree.ElementTree as ET
import sys
import pgatourdb
import glob

if __name__ == "__main__":
    script, tournament_dir, height, width = sys.argv

    #Remove trailing / if present.
    if tournament_dir[-1] == "/":
        tournament_dir = tournament_dir[:-1]

    connection = pgatourdb.connect()
    curr = connection.cursor()

    #Search all camera files in dir.
    for file in glob.glob(tournament_dir + "/*camerametadata.xml"):
        tree = ET.parse(file)
        root = tree.getroot()

        course_id = root.attrib['CourseNum']

        for hole in root:
            for camera in hole:
                for coord in camera:
                    query = "insert into camera values ('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s','%s');" % (
                        hole.attrib['HoleNum'], course_id, coord.attrib['Lens'], coord.attrib['Fov'], coord.attrib['Camera_x'], coord.attrib['Camera_y'], coord.attrib['Camera_z'], 
                        coord.attrib['Target_x'], coord.attrib['Target_y'], coord.attrib['Target_z'], coord.attrib['Roll'], camera.attrib['Type']
                        )
                    print query
                    curr.execute(query)
        connection.commit()




