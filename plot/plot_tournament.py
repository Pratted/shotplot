import sys
import pgatourdb
import pymysql
import glob
import plot as plotter

conn = pgatourdb.connect()
cursor = conn.cursor(pymysql.cursors.DictCursor)

def plot_hole_markers(course_id, round_id, hole):
	query = """select lens, fov ,camera_x , camera_y , camera_z , target_x , target_y , target_z , roll from camera
				where course_id = '%s' and hole = '%s' and camera_type = 'hole'""" % (course_id, hole)

	cursor.execute(query)
	hole_info = cursor.fetchone()

	query = """select tee_x, tee_y, tee_z, pin_x, pin_y, pin_z from hole_camera
				where course_id = '%s' and hole = '%s' and round_id = '%s'""" % (course_id, hole, round_id)

	cursor.execute(query)
	rows = cursor.fetchone()

	tee = plotter.Vector(rows["tee_x"], rows["tee_y"], rows["tee_z"])
	pin = plotter.Vector(rows["pin_x"], rows["pin_y"], rows["pin_z"])

	tee = plotter.plot(tee, hole_info, 1024, 2256)
	pin = plotter.plot(pin, hole_info, 1024, 2256)

	query = """insert into tee_coordinate (hole, course_id, round_id, camera_mode, tee_px_x, tee_px_y) values (%s, '%s', %s, '%s', %s, %s) """ % (
				hole, course_id, round_id, 'hole', tee[0], tee[1])

	cursor.execute(query)
	conn.commit()
	return
	query = """insert into pin_coordinate (hole, course_id, round_id, camera_mode, pin_px_x, pin_px_y) values (%s, '%s', %s, '%s', %s, %s) """ % (
				hole, course_id, round_id, 'hole', pin[0], pin[1])

	cursor.execute(query)
	conn.commit()

def plot_player_hole(course_id, round_id, player_id, hole):
	query = """select lens, fov ,camera_x , camera_y , camera_z , target_x , target_y , target_z , roll from camera
				where course_id = '%s' and hole = '%s' and camera_type = 'hole'""" % (course_id, hole)

	cursor.execute(query)
	hole_info = cursor.fetchone()

	query = """select x,y,z from shot
				where course_id = '%s' and round_id = %s and player_id = '%s' and c_hole = '%s'
				order by seq""" % (course_id, round_id, player_id, hole)

	print query

	cursor.execute(query)
	records = cursor.fetchall()

	for i, record in enumerate(records,1):
		shot = plotter.Vector(record["x"], record["y"], record["z"])
		coords = plotter.plot(shot, hole_info, 1024, 2256)

		print coords
	
		query = """update shot
				set px_x = %s,
				px_y = %s
				where course_id = '%s' and round_id = %s and player_id = '%s' and c_hole = '%s' and seq = '%s'""" % (coords[0], coords[1], course_id, round_id, player_id, hole, i)

		print query
		cursor.execute(query)
		conn.commit()



if __name__ == "__main__":
	ids = [32366, 36689, 32333, 29725, 22371, 27974, 35891, 19846, 23320, 27770, 34021, 29974, 25191, 25632, 26300, 46441, 25345, 46501, 26596, 31557, 27936, 20229, 23353, 37455, 25493, 34174, 22046, 37278, 49771, 25572, 34358, 48822, 1320, 46550, 28420, 27064, 29476, 29222, 46440, 12716, 37189, 29461, 23497, 33948, 23541, 34242, 29720, 23108, 32640, 33418, 32150, 39324, 35532, 27214, 21731, 33449, 23800, 28252, 20104, 10860, 25834, 22056, 47741, 35545, 29518, 22986, 24846, 30944, 40009, 29740, 35300, 30852, 31420, 33399, 30191, 20771, 20645, 20691, 40058, 25349, 39977, 46048, 24912, 28158, 20593, 27095, 27963, 37454, 25892, 12510, 37380, 20848, 24138, 20157, 28500, 48081, 34076, 51933, 51975, 27129, 25720, 34360, 30926, 34431, 29289, 24358, 33120, 32070, 19803, 28132, 27466, 24781, 29420, 30692, 47128, 27958, 24507, 29908, 23983, 24024, 25240, 20472, 34265, 29223, 35879, 35506, 24357, 25274, 35110, 29926, 31560, 46601, 25818, 39954, 28307, 23621, 47959, 39975, 33141, 46732, 26951, 33461, 46443, 33419, 34466, 35461, 35541, 26758, 29485, 21959, 29745, 32200, 33409, 46507, 28093, 22621]
	print "hello world."
	"""
	for pid in ids:
		for i in range(1,19):
				for j in range(1,5):
					plot_player_hole("770",j,pid,i)
	"""
	for i in range(1,5):
		for j in range(1,19):
			plot_hole_markers(770,i, j)

	print "Done"


 
