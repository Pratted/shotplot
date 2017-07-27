# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.http import HttpResponse
from django.shortcuts import render
from django.db import connections, models
from django.http import JsonResponse

import json

def dictfetchall(cursor):
    desc = cursor.description
    return [
        dict(zip([col[0] for col in desc], row)) for row in cursor.fetchall()
    ]

def main(request):
    if request.method == 'GET' and len(request.GET):
        print "Request length: %s" % len(request.GET)
        tournament_id = request.GET.get('tournament_id')
        season = request.GET.get('season')
        player_id = request.GET.get('player_id')
        round_id = request.GET.get('round_id')
        path = request.GET.get('true')
        hole = request.GET.get('hole')
        course_id = request.GET.get('course_id')
        tee_markers = request.GET.get('tee_markers')

        if 'season' in request.GET:
            if len(request.GET) == 1:
                return initTournaments(season)

            if 'tournament_id' in request.GET:
                if len(request.GET) == 2:
                    return initPlayers(season, tournament_id)

                if 'tee_markers' in request.GET:
                    return getHoleInfo(season, tournament_id)

                if 'long_drives' in request.GET:
                    return getLongDrives(season, tournament_id)

                if 'all_drives' in request.GET:
                    return getAllDrives(season, tournament_id)

                if 'player_id' in request.GET:
                    if 'shot_paths' in request.GET:
                        print "Shot paths requested!"
                        return getPlayerShots(season, tournament_id, player_id)



    else:
        print "Homepage requested."

    return render(request, 'leaflet/leat.html')

"""
Returns a string of options for select element tournamentSelect.

    <option id="025">The Players Championship</option>
    <option id="xxx">Name</option>
    ...
"""
def initTournaments(season):
    query = "select distinct tournament_id, tournament_name from Tournament where start_date < CURDATE() order by start_date desc;"

    c = connections['default'].cursor()
    c.execute(query)

    rows = c.fetchall()
    tourns = "\n".join(['<option id="' + str(tournament[0]).zfill(3) + '">' + tournament[1] + "</option>" for tournament in rows])

    return HttpResponse(tourns)


def initPlayers(season, tournament_id):
    query = """select hs.course_id, p.player_id, concat(last_name, ', ', first_name) as name, hs.round_id from player p
            join field f on f.player_id = p.player_id 
            join hole_score hs on hs.player_id = p.player_id and hs.tournament_id = f.tournament_id
            where f.tournament_id = '%s' 
            group by hs.course_id, p.player_id, concat(last_name, ', ', first_name), hs.round_id
            having round_id = (select max(round_id) from hole_score where player_id = p.player_id and tournament_id = '%s')
            order by last_name, first_name""" % (tournament_id, tournament_id)

    c = connections['default'].cursor()
    c.execute(query)

    result = dictfetchall(c)
    return JsonResponse(result, safe=False)


def getHoleInfo(season, tournament_id):
    query = """select tc.hole, c.course_id, tc.round_id, tee_px_x, tee_px_y, pin_px_x, pin_px_y, tc.camera_mode from tee_coordinate tc
                join course c on c.course_id = tc.course_id
                join pin_coordinate pc on pc.course_id = tc.course_id and pc.hole = tc.hole and tc.round_id = pc.round_id
                where c.tournament_id = '%s'""" % tournament_id

    c = connections['default'].cursor()
    c.execute(query)

    result = dictfetchall(c)
    rounds = []

    for i in range(1,6):
        round = []
        [round.append(coordinate) for coordinate in result if coordinate["round_id"] == i]

        if round: rounds.append(round)

    return JsonResponse(rounds, safe=False)

def getPlayerShots(season, tournament_id, player_id):
    query = """select round_id, c_hole, px_x, px_y, text, seq from shot
    where tournament_id = '%s' and player_id = '%s'
    order by round_id, c_hole""" % (tournament_id, player_id)

    c = connections['default'].cursor()
    c.execute(query)

    result = dictfetchall(c)
    rounds = []

    for i in range(1,6):
        round = []
        [round.append(shot) for shot in result if shot["round_id"] == i]

        if round: rounds.append(round)

    return JsonResponse(rounds, safe=False)


def getLongDrives(season, tournament_id):
    query = """
    select s.c_hole as hole, 
        s.round_id, 
        concat(substring(p.first_name,1,1), '. ', p.last_name) as 'player', 
        floor(s.dist / 36) 'distance',
        px_x,
        px_y
    from shot s
    join (
    select max(dist) as dist, c_hole, round_id from shot
    where seq = 1 and tournament_id = '%s'
    group by round_id, seq, tournament_id, c_hole
    ) sub on sub.dist = s.dist and sub.c_hole = s.c_hole and sub.round_id = s.round_id
    join player p on s.player_id = p.player_id
    #join hole h on h.course_id = s.course_id and s.c_hole = h.hole_num
    where seq = 1 and s.tournament_id = '%s' #and h.par != 3 #exclude par 3
    order by s.c_hole, s.round_id""" % (tournament_id, tournament_id)

    c = connections['default'].cursor()
    c.execute(query)

    result = dictfetchall(c)
    rounds = []
    for i in range(1,6):
        round = []
        [round.append(shot) for shot in result if shot["round_id"] == i]

        if round: rounds.append(round)

    return JsonResponse(rounds, safe=False)

def getAllDrives(season, tournament_id):
    query = """select s.c_hole as hole, 
                    s.round_id, 
                    concat(p.last_name, ', ', substring(p.first_name,1,1)) as 'player', 
                    floor(s.dist / 36) 'distance',
                    px_x,
                    px_y,
                    hs.strokes - h.par as 'diff',
                    p.player_id
                from shot s
                join player p on s.player_id = p.player_id
                join hole h on h.course_id = s.course_id and s.c_hole = h.hole_num
                join hole_score hs on hs.player_id = p.player_id and hs.hole_num = s.c_hole and hs.round_id = s.round_id and hs.course_id = h.course_id
                where seq = 1 and s.tournament_id = '%s' #and h.par != 3 #exclude par 3
                order by s.c_hole, s.round_id
                limit 10000""" % (tournament_id)

    c = connections['default'].cursor()
    c.execute(query)     
    
    result = dictfetchall(c);
    return JsonResponse(result, safe=False)   




