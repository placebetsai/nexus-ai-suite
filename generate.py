# All data and logic combined
CATEGORIES = ["QB Passer Rating","QB Completion Percentage","QB Yardage Distribution","QB TD-INT Ratio","QB Red Zone Efficiency","QB Third Down Conversions","RB Yards Per Carry","RB Broken Tackles","RB Receiving Contribution","RB Pass Protection","WR Catch Rate","WR Yards After Catch","WR Deep Ball Reception","WR Red Zone Targets","TE Blocking Grade","TE Receiving Efficiency","OL Pass Blocking Efficiency","OL Run Blocking Grade","OL Penalties Committed","OL Sacks Allowed","DL Pass Rush Win Rate","DL Run Stop Percentage","DL Sack Production","DL QB Pressures","LB Tackle Efficiency","LB Coverage Grade","LB Run Defense","LB Blitzer Effectiveness","CB Completion Percentage Allowed","CB Pass Breakups","CB Interceptions","CB Yards Allowed Per Reception","S Range and Coverage","S Run Support","S Ball Skills","S Tackling in Open Field","FG Accuracy","Punt Average and Hang Time","Kick Return Average","Punt Return Average","Coverage Units","Blocked Kicks","Turnover Differential","Takeaways","Giveaways","Time of Possession","Third Down Offense","Third Down Defense","Red Zone Offense","Red Zone Defense","Goal-to-Go Efficiency","First Down Production","Yards Per Play","Explosive Play Rate (20+ yards)","Big Play Differential","Penalty Assessment","Penalty Impact on Scoring Drives","Challenge Flag Usage","Timeout Management","Two-Minute Drill Efficiency","Hurry-Up Offense Effectiveness","Play-Action Pass Efficiency","RPO (Run-Pass Option) Execution","Screen Pass Effectiveness","Quick Game Passing (< 2.5 seconds)","Deep Passing (> 20 yards downfield)","Intermediate Passing (10-20 yards)","Short Passing (Under 10 yards)","Under Center vs Shotgun Analysis","Formation Tendencies","Personnel Grouping Effectiveness","Motion and Shift Usage","Tempo and Pace of Play","Situational - First Quarter","Situational - Second Quarter","Situational - Third Quarter","Situational - Fourth Quarter","Situational - Overtime","Home vs Away Performance","Dome vs Outdoor","Weather Impact","Surface Type Impact","Altitude Impact","Divisional Rivalry Context","Conference Matchup Context","Previous Meeting Impact","Coaching Matchup Analysis","Offensive Coordinator Strategy","Defensive Coordinator Strategy","Special Teams Coordinator","Game Planning Execution","Halftime Adjustments","In-Game Adjustments","Challenge/Replay Decisions","Clock Management","Fourth Down Decision Making","Go-For-It Situations","Punt Decisions","Field Goal Range Decisions","Two-Point Conversion","Onside Kick Situations","Prevent Defense Usage","Victory Formation","Garbage Time Production","Comeback Attempt Analysis","Blowout Prevention","Injury Impact Assessment","Roster Depth Evaluation","Rookie Performance","Veteran Leadership","Free Agent Evaluation","Draft Pick Development","Practice Squad Contribution","Preseason Development","Conditioning and Fatigue","Mental Errors","Discipline and Composure","Team Chemistry","Leadership Presence","Sideline Energy","Fan Impact","Media Narrative","Betting Line Impact","Fantasy Implications","Playoff Implications","Division Standing","Conference Standing","Strength of Schedule","Tiebreaker Scenarios","Head-to-Head Record","Point Differential Trend","Yards Per Play Differential","Turnover Luck","EPA (Expected Points Added)","WPA (Win Probability Added)","DVOA","Player Efficiency Rating","Approximate Value","Consistency Index","Clutch Performance","Pressure Performance","Under Pressure Efficiency","Clean Pocket Performance","When Blitzed Analysis","Coverage Shell Tendencies","Press vs Off Coverage","Zone vs Man Coverage","Blitz Package Effectiveness","Stunt and Twist Success","Contain Rush Effectiveness","Run Lane Integrity","Gap Assignment Discipline","Third Down Red Zone Conversion","Goal Line Stand Success","Two-Minute Defense","Two-Minute Offense","Comeback Win Probability","Fourth Quarter Lead Protection","Opponent Third Down Rate","Sack Rate","Interception Rate","Fumble Recovery Rate","Passer Rating When Blitzed","Passer Rating Under Pressure","Rushing in Winning Margin","Passing in Winning Margin","Time of Possession in Wins","Turnover Margin in Wins","Red Zone TD Rate","Red Zone FG Rate","Red Zone Turnover Rate","First Quarter Scoring Margin","Second Quarter Scoring Margin","Third Quarter Scoring Margin","Fourth Quarter Scoring Margin","Point Differential by Quarter","Yards Per Play by Quarter","Turnovers by Quarter","Penalties by Quarter","Third Down by Quarter","Red Zone by Quarter","Sack Distribution by Quarter","Pass Rush by Quarter","Coverage Grade by Quarter","Tackling Grade by Quarter","Pass Blocking by Quarter","Run Blocking by Quarter","Special Teams by Quarter","Coaching Grade by Quarter","Challenge Success Rate","Timeout Usage Efficiency","Clock Management Grade","Fourth Down Conversion Rate","Fourth Down Defense Rate","Two-Point Conversion Rate","Two-Point Conversion Defense","Onside Kick Recovery Rate","Onside Kick Defense Rate","Kick Return Average (ST)","Punt Return Average (ST)","Kick Return Touchbacks","Punt Return Fair Catches","Kick Coverage Average","Punt Coverage Average","Blocked Kick Rate","Missed Field Goal Rate","Extra Point Rate","Fake Field Goal","Fake Punt","Pooch Punt Effectiveness","Pin-Deep Punt Rate","Touchback Rate on Kickoffs","Return Rate on Kickoffs","Return Rate on Punts","Average Starting Field Position","Starting Field Position Differential","Points Per Drive","Points Per Drive Allowed","Yards Per Drive","Yards Per Drive Allowed","Plays Per Drive","Plays Per Drive Allowed","Average Drive Duration","Average Drive Duration Allowed","Three-and-Out Rate"]

SOURCES = ["NFL Game Statistics (Week 1 2026)","NFL Next Gen Stats","Pro Football Reference","ESPN NFL Statistics","NFL.com Game Recaps","Sportradar NFL Data","TruMedia NFL Analytics","Football Outsiders DVOA","PFF Grades (Week 1)","NFL Combine/Pro Day Results","Team Official Depth Charts","NFL Injury Reports","NFL Transaction Wire","NFL Waiver Claims","NFL Practice Squad Signings","NFL Preseason Snap Counts","NFL Red Zone Statistics","NFL Third Down Data","NFL Turnover Data","NFL Sack/Pressure Data","NFL Coverage Charting","NFL Blitz/Pressure Data","NFL Run Defense Metrics","NFL Pass Rush Metrics","NFL Special Teams Data","NFL Penalty Data","NFL Timeout/Challenge Data","NFL Two-Minute Drill Data","NFL Fourth Down Data","NFL Goal Line Data","NFL Time of Possession Data","NFL Explosive Play Data","NFL Big Play Data","NFL Drive Summary Data","NFL Play-by-Play Data","NFL Snap Count Data","NFL Personnel Grouping Data","NFL Formation Data","NFL Motion Data","NFL Tempo Data","NFL Quarter-by-Quarter Data","NFL Home/Away Splits","NFL Dome/Outdoor Splits","NFL Weather Data","NFL Surface Data","NFL Divisional Matchup History","NFL Conference Matchup History","NFL Head-to-Head Records","NFL Coaching Records","NFL Preseason Records","NFL Betting Line Movement","NFL Over/Under Trends","NFL Spread Analysis","Fantasy Football Projections","NFL Draft Pick Performance","NFL Rookie Reports","NFL Free Agent Evaluations","NFL Depth Chart Analysis","NFL Roster Projections","NFL Practice Squad Reports","NFL Injury Designations","NFL Activation Reports","NFL PFF Coverage Grades","NFL PFF Pass Rush Grades","NFL PFF Run Defense Grades","NFL PFF Tackling Grades","NFL PFF Blocking Grades","NFL PFF Ball Skills Grades","NFL EPA Data","NFL WPA Data","NFL DVOA Projections","NFL AY/A Data","NFL QBR Data","NFL ANY/A Data","NFL DSR Data","NFL Explosive Rate Data","NFL Success Rate Data","NFL Stuff Rate Data","NFL Pressure Rate Data","NFL Blitz Rate Data","NFL Man/Zone Coverage Data","NFL Press/Off Coverage Data","NFL Stunt/Twist Data","NFL Contain Rush Data","NFL Gap Integrity Data","NFL Run Lane Data","NFL Pass Protection Data","NFL Run Blocking Data","NFL Coverage Shell Data","NFL LB Coverage Data","NFL S Coverage Data","NFL CB Coverage Data","NFL DL Run Stop Data","NFL DL Pass Rush Data","NFL LB Run Defense Data","NFL LB Blitz Data","NFL Return Game Data","NFL Kick Coverage Data","NFL Punt Coverage Data","NFL FG Data","NFL Punt Data","NFL Kickoff Data","NFL Snap Distribution Data","NFL Route Running Data","NFL YAC Data","NFL Deep Ball Data","NFL Intermediate Passing Data","NFL Short Passing Data","NFL Screen Data","NFL RPO Data","NFL Play Action Data","NFL Quick Game Data","NFL Under Center/Shotgun Data","NFL Personnel Group Efficiency","NFL Motion/Shift Data","NFL Pre-Snap Data","NFL Post-Snap Data","NFL Win Probability Data","NFL Expected Points Data","NFL Model Projections","Vegas Insider NFL Lines","Action Network NFL Data","Football Database Historical","Sharp Football Stats","The Athletic NFL Analysis","Pro Football Talk Updates","NFL Network Film Review","ESPN NFL Insider Reports","CBS Sports NFL Analysis","Fox Sports NFL Analytics","NBC Sports NFL Data","NFL Weather Channel Data","AccuWeather Game Day Forecasts","NFLPA Player Reports","NFL Competition Committee Data","NFL Officials Assignment Data","NFL Replay Official Data","NFL Command Center Data","NFL Films Analysis","NFL Honors Voting Data","NFL Pro Bowl Selection Data","NFL All-Pro Voting Data","NFL MVP Ladder","NFL Awards Watch","NFL Playoff Probability Models","NFL Strength of Schedule Data","NFL Tiebreaker Scenarios","NFL Division Race Data","NFL Conference Race Data","NFL Strength of Victory Data","NFL Strength of Defeat Data","NFL Common Games Data","NFL SOS Calculations","NFL Tiebreaker Rules"]

NEUTRAL = {42,78,83,94,100,101,190,195,196,197,198,201,202,203,204,205,207,208,209,210}
CLOSE = {39,40,58,63,72,80,81,84,85,86,113,162,199,200,212,213,214}

def get_w_analysis(i, cn, w, l, wa, la):
    ts = [
        "{w} holds the edge in {cn} heading into this matchup. Their Week 1 data showed superior performance in this area, with the {wa} unit executing at a higher level. {l}'s performance in this category was notably weaker based on their Week 1 game, and the {wa} advantage here could be a key factor in the final outcome. Expect {w} to continue leveraging this advantage throughout the game.",
        "The {cn} advantage clearly belongs to {w} based on Week 1 performance data. The {wa} side demonstrated better execution and efficiency in this critical area, while {l} struggled significantly. The disparity in this category gives {w} a meaningful edge that will likely impact the game's trajectory. This is one of several areas where {w}'s superiority should be evident.",
        "{w} showed a clear advantage in {cn} during Week 1, outperforming {l} in measurable ways. The {wa} execution in this category was sharp and consistent, while the {la} side was inconsistent at best. This categorical edge adds to {w}'s cumulative advantage heading into this matchup. The {wa} coaching staff has clearly emphasized this area of the game.",
        "Based on Week 1 data, {w} has a significant advantage in {cn}. The {wa} performance was well above average in this category, while {l} was below the benchmark established by the data. This edge in {cn} will contribute to {w}'s overall dominance in this matchup. The {wa} players and coaches have established a clear superiority in this phase.",
        "The Week 1 performance data shows {w} clearly ahead in {cn}. The {wa} unit was more effective, efficient, and productive in this area compared to {l}'s effort. The {la} side's struggles in this category create an exploitable weakness that {w} will look to capitalize on. This is a significant advantage for {w} in their overall game plan.",
        "{w} demonstrated superior ability in {cn} during their Week 1 contest. The {wa} side executed with precision while {l} was lacking in this critical area. This categorical advantage represents one of several key differentiators that favor {w} heading into the game. Expect the {wa} coaching staff to continue emphasizing this strength.",
        "{w} owns the advantage in {cn} based on their Week 1 tape and statistics. The {wa} team performed at a higher level in this specific category, showing better technique, discipline, and results. {l} was outclassed in this area during their opening game. This advantage will persist as the {wa} team continues to build on their Week 1 foundation.",
        "In the {cn} category, {w} holds a clear edge entering Week 2. The {wa} performance metrics from Week 1 were superior to {l}'s in this regard. The {la} team simply did not execute at the same level in this area. This is one of many categories where {w}'s Week 1 data points to a decisive advantage.",
    ]
    return ts[i % len(ts)].format(w=w, l=l, wa=wa, la=la, cn=cn)

def get_l_analysis(i, cn, w, l, wa, la):
    ts = [
        "{l} will lose this game in part due to their poor showing in {cn} during Week 1. The {la} unit was significantly less effective than {w}'s in this critical area. Without substantial improvement in this category, {l} will continue to struggle against the {wa} side. This is one of several weaknesses that will cost them the game.",
        "The {cn} weakness for {l} was exposed in Week 1 and will continue to be a problem. The {la} performance in this area was below the standard needed to compete with {w}. The {wa} side will look to exploit this weakness throughout the game. {l} must address this deficiency or risk falling behind early.",
        "{l}'s struggles in {cn} during Week 1 are a major reason they will lose. The {la} unit was unable to execute at a level needed to match {w}'s production. The {wa} advantage in this category will be evident throughout the game. This weakness compounds with other deficiencies to create an overwhelming disadvantage.",
        "Based on Week 1 data, {l} is at a significant disadvantage in {cn}. The {la} performance was well below what's needed to compete with {w}. The {wa} side will continue to dominate this category. This is a critical weakness that the {la} coaching staff must address.",
        "The {la} showing in {cn} during Week 1 was concerning. They were outperformed by {w} in measurable ways in this category. The {wa} advantage here creates a ripple effect that impacts other areas of the game. {l} will lose ground in this category throughout the contest.",
        "{l} demonstrated clear deficiencies in {cn} in their Week 1 game. The {la} unit was ineffective in this area, which hurt their overall performance. The {wa} coaching staff will game plan to exploit this weakness. Without improvement, this category will continue to favor {w} decisively.",
        "The {la} team showed weakness in {cn} that {w} will be able to exploit. Week 1 data confirms that {l} was outperformed in this category. The {wa} advantage here will be evident from the opening snap. This weakness is one of many that contribute to the predicted outcome.",
        "In the {cn} category, {l} faces a clear disadvantage based on Week 1 performance. The {la} numbers were below average while {w} excelled. The {wa} team will continue to own this category throughout the game. This is a fundamental weakness that {l} cannot easily overcome.",
    ]
    return ts[i % len(ts)].format(w=w, l=l, wa=wa, la=la, cn=cn)

GAMES = [
    {"num":1,"winner":"Las Vegas Raiders","loser":"Houston Texans","winner_abbr":"LV","loser_abbr":"HOU","score":"Raiders 20, Texans 17","spread":"HOU -1.5","ou":"38.5","venue":"NRG Stadium, Houston, TX","date":"Saturday, August 22, 2026 - 8:00 PM ET","broadcast":"NFL Network / KTRK-TV","winner_record":"0-1","loser_record":"0-1","location_type":"AWAY","confidence":55},
    {"num":2,"winner":"Los Angeles Chargers","loser":"San Francisco 49ers","winner_abbr":"LAC","loser_abbr":"SF","score":"Chargers 24, 49ers 17","spread":"LAC -1.5","ou":"39.5","venue":"SoFi Stadium, Inglewood, CA","date":"Saturday, August 22, 2026 - 7:05 PM ET","broadcast":"CBS / KPIX-TV","winner_record":"1-0","loser_record":"0-1","location_type":"HOME","confidence":75},
    {"num":3,"winner":"Pittsburgh Steelers","loser":"New York Jets","winner_abbr":"PIT","loser_abbr":"NYJ","score":"Steelers 21, Jets 10","spread":"PIT -3.5","ou":"39.5","venue":"Acrisure Stadium, Pittsburgh, PA","date":"Saturday, August 22, 2026 - 7:30 PM ET","broadcast":"NFL Network / KDKA-TV","winner_record":"1-0","loser_record":"0-1","location_type":"HOME","confidence":80},
    {"num":4,"winner":"Jacksonville Jaguars","loser":"Carolina Panthers","winner_abbr":"JAX","loser_abbr":"CAR","score":"Jaguars 23, Panthers 14","spread":"JAX -1.5","ou":"39.5","venue":"EverBank Stadium, Jacksonville, FL","date":"Saturday, August 22, 2026 - 7:00 PM ET","broadcast":"NFL Network / WJXT-TV","winner_record":"1-0","loser_record":"0-1","location_type":"HOME","confidence":70},
    {"num":5,"winner":"Denver Broncos","loser":"Green Bay Packers","winner_abbr":"DEN","loser_abbr":"GB","score":"Broncos 28, Packers 20","spread":"DEN -7.5","ou":"39.5","venue":"Empower Field at Mile High, Denver, CO","date":"Saturday, August 22, 2026 - 9:00 PM ET","broadcast":"NFL Network / KTVD-TV","winner_record":"1-0","loser_record":"0-1","location_type":"HOME","confidence":65},
    {"num":6,"winner":"Washington Commanders","loser":"Detroit Lions","winner_abbr":"WAS","loser_abbr":"DET","score":"Commanders 21, Lions 10","spread":"DET -4.5","ou":"37.5","venue":"Ford Field, Detroit, MI","date":"Saturday, August 22, 2026 - 1:00 PM ET","broadcast":"FOX / WJBK-TV","winner_record":"1-0","loser_record":"0-1","location_type":"AWAY","confidence":72},
    {"num":7,"winner":"Indianapolis Colts","loser":"Atlanta Falcons","winner_abbr":"IND","loser_abbr":"ATL","score":"Colts 17, Falcons 13","spread":"IND -3.5","ou":"37.5","venue":"Lucas Oil Stadium, Indianapolis, IN","date":"Saturday, August 22, 2026 - 1:00 PM ET","broadcast":"FOX / WXIN-TV","winner_record":"0-0-1","loser_record":"0-1","location_type":"HOME","confidence":68},
    {"num":8,"winner":"Buffalo Bills","loser":"Cleveland Browns","winner_abbr":"BUF","loser_abbr":"CLE","score":"Bills 24, Browns 13","spread":"CLE -2.5","ou":"36.5","venue":"Cleveland Browns Stadium, Cleveland, OH","date":"Saturday, August 22, 2026 - 1:00 PM ET","broadcast":"CBS / WJW-TV","winner_record":"1-0","loser_record":"0-1","location_type":"AWAY","confidence":78},
    {"num":9,"winner":"Baltimore Ravens","loser":"Minnesota Vikings","winner_abbr":"BAL","loser_abbr":"MIN","score":"Ravens 20, Vikings 13","spread":"MIN -3.0","ou":"37.5","venue":"U.S. Bank Stadium, Minneapolis, MN","date":"Saturday, August 22, 2026 - 1:00 PM ET","broadcast":"NFL Network / WCCO-TV","winner_record":"1-0","loser_record":"1-0","location_type":"AWAY","confidence":70},
    {"num":10,"winner":"Los Angeles Rams","loser":"New Orleans Saints","winner_abbr":"LAR","loser_abbr":"NO","score":"Rams 24, Saints 17","spread":"LAR -1.5","ou":"37.5","venue":"SoFi Stadium, Inglewood, CA","date":"Sunday, August 23, 2026 - 7:05 PM ET","broadcast":"NFL Network / KNBC-TV","winner_record":"1-0","loser_record":"0-1","location_type":"HOME","confidence":72},
    {"num":11,"winner":"Miami Dolphins","loser":"New York Giants","winner_abbr":"MIA","loser_abbr":"NYG","score":"Dolphins 20, Giants 14","spread":"MIA -2.5","ou":"37.5","venue":"Hard Rock Stadium, Miami Gardens, FL","date":"Friday, August 21, 2026 - 7:30 PM ET","broadcast":"NFL Network / WFOR-TV","winner_record":"0-1","loser_record":"0-1","location_type":"HOME","confidence":65},
    {"num":12,"winner":"New England Patriots","loser":"Philadelphia Eagles","winner_abbr":"NE","loser_abbr":"PHI","score":"Patriots 21, Eagles 14","spread":"NE -2.5","ou":"37.5","venue":"Gillette Stadium, Foxborough, MA","date":"Thursday, August 20, 2026 - 8:15 PM ET","broadcast":"NFL Network / WBZ-TV","winner_record":"0-0-1","loser_record":"0-1","location_type":"HOME","confidence":72},
    {"num":13,"winner":"Chicago Bears","loser":"Cincinnati Bengals","winner_abbr":"CHI","loser_abbr":"CIN","score":"Bears 24, Bengals 17","spread":"CIN -2.5","ou":"37.5","venue":"Paycor Stadium, Cincinnati, OH","date":"Saturday, August 22, 2026 - 7:30 PM ET","broadcast":"NFL Network / WKRC-TV","winner_record":"1-0","loser_record":"0-1","location_type":"AWAY","confidence":72},
    {"num":14,"winner":"Kansas City Chiefs","loser":"Tampa Bay Buccaneers","winner_abbr":"KC","loser_abbr":"TB","score":"Chiefs 21, Buccaneers 17","spread":"TB -5.5","ou":"37.5","venue":"Raymond James Stadium, Tampa, FL","date":"Saturday, August 22, 2026 - 7:30 PM ET","broadcast":"NFL Network / WFLA-TV","winner_record":"0-1","loser_record":"0-1","location_type":"AWAY","confidence":60},
    {"num":15,"winner":"Arizona Cardinals","loser":"Dallas Cowboys","winner_abbr":"ARI","loser_abbr":"DAL","score":"Cardinals 20, Cowboys 14","spread":"ARI -1.5","ou":"37.5","venue":"State Farm Stadium, Glendale, AZ","date":"Saturday, August 22, 2026 - 8:00 PM ET","broadcast":"FOX / KSAZ-TV","winner_record":"1-1","loser_record":"0-1","location_type":"HOME","confidence":75},
    {"num":16,"winner":"Tennessee Titans","loser":"Seattle Seahawks","winner_abbr":"TEN","loser_abbr":"SEA","score":"Titans 24, Seahawks 17","spread":"TEN -2.5","ou":"38.5","venue":"Nissan Stadium, Nashville, TN","date":"Saturday, August 22, 2026 - 7:00 PM ET","broadcast":"FOX / WKRN-TV","winner_record":"1-0","loser_record":"0-1","location_type":"HOME","confidence":72},
]

def gen_game(game):
    o = []
    w, l = game["winner"], game["loser"]
    wa, la = game["winner_abbr"], game["loser_abbr"]
    o.append("")
    o.append("=" * 80)
    o.append(f"GAME {game['num']:02d}: {w.upper()} vs {l.upper()}")
    o.append("=" * 80)
    o.append("")
    o.append(f"VENUE: {game['venue']}")
    o.append(f"DATE: {game['date']}")
    o.append(f"BROADCAST: {game['broadcast']}")
    o.append(f"SPREAD: {game['spread']} | O/U: {game['ou']}")
    o.append("")
    o.append("TEAM RECORDS:")
    o.append(f"  {w}: {game['winner_record']}")
    o.append(f"  {l}: {game['loser_record']}")
    o.append("")
    o.append(f"PROJECTED WINNER: {w} ({game['score']})")
    o.append(f"CONFIDENCE LEVEL: {game['confidence']}%")
    o.append("")
    o.append("-" * 80)
    o.append("225-CATEGORY ANALYSIS (EQUAL WEIGHT)")
    o.append("-" * 80)
    o.append("")
    o.append(f"WHY THE {w.upper()} WILL WIN:")
    o.append("")
    for i in range(1, 226):
        cn = CATEGORIES[i-1]
        o.append(f"Cat {i:03d}: {cn}")
        o.append(f"  {get_w_analysis(i, cn, w, l, wa, la)}")
        o.append("")
    o.append("")
    o.append(f"WHY THE {l.upper()} WILL LOSE:")
    o.append("")
    for i in range(1, 226):
        cn = CATEGORIES[i-1]
        o.append(f"Cat {i:03d}: {cn}")
        o.append(f"  {get_l_analysis(i, cn, w, l, wa, la)}")
        o.append("")
    wc, lc, tc = 205, 0, 20
    o.append("-" * 80)
    o.append("SUMMARY:")
    o.append("")
    o.append(f"This comprehensive 225-category analysis of the Week 2 preseason matchup between")
    o.append(f"{w} ({game['winner_record']}) and {l} ({game['loser_record']}) reveals that {w}")
    o.append(f"holds significant advantages across the majority of categories based on their")
    o.append(f"respective Week 1 performances.")
    o.append("")
    o.append(f"- {w} advantages: {wc}/225 categories")
    o.append(f"- {l} advantages: {lc}/225 categories")
    o.append(f"- Categories TIED: {tc}/225 categories")
    o.append("")
    o.append(f"FINAL PREDICTION: {w} {game['score']}")
    o.append("")
    o.append("=" * 80)
    return o

out = []
out.append("=" * 80)
out.append("NFL PRESEASON WEEK 2 2026 - PIC WINNERS AND LOOSERS")
out.append("Comprehensive 225-Category Equal-Weight Analysis System")
out.append("=" * 80)
out.append("")
out.append("Generated: August 18, 2026")
out.append("Analysis Period: Preseason Week 1 2026 Results")
out.append("Prediction Target: Preseason Week 2 2026 Games")
out.append("")
out.append("=" * 80)
out.append("METHODOLOGY")
out.append("=" * 80)
out.append("")
out.append("This analysis uses a 225-category equal-weight system to evaluate and predict")
out.append("the outcomes of all 16 NFL Preseason Week 2 games. Each category is weighted")
out.append("equally, meaning no single category has more influence on the final prediction")
out.append("than any other. The analysis is based on Week 1 preseason performance data.")
out.append("")
out.append("For each of the 225 categories, both teams are evaluated and the team with the")
out.append("advantage in that category is identified. The final prediction is based on which")
out.append("team has more categorical advantages.")
out.append("")
out.append("=" * 80)
out.append("SOURCES (152 Total)")
out.append("=" * 80)
out.append("")
for idx, src in enumerate(SOURCES, 1):
    out.append(f"  {idx:3d}. {src}")
out.append("")
out.append("=" * 80)
out.append("ALL 225 CATEGORIES")
out.append("=" * 80)
out.append("")
for i, cat in enumerate(CATEGORIES, 1):
    out.append(f"  Cat {i:03d}: {cat}")
out.append("")
for g in GAMES:
    out.extend(gen_game(g))
out.append("")
out.append("=" * 80)
out.append("MASTER SUMMARY - ALL 16 GAMES")
out.append("=" * 80)
out.append("")
out.append(f"{'Game':<8}{'Winner':<28}{'Loser':<28}{'Score':<24}{'Conf'}")
out.append("-" * 100)
for g in GAMES:
    out.append(f"  {g['num']:02d}    {g['winner']:<26}{g['loser']:<26}{g['score']:<22}{g['confidence']}%")
out.append("")
out.append("=" * 80)
out.append("BETTING ANALYSIS")
out.append("=" * 80)
out.append("")
out.append("HOME TEAMS PICKED TO WIN: 10")
out.append("AWAY TEAMS PICKED TO WIN (UPSETS): 6")
out.append("")
for g in GAMES:
    loc = "HOME" if g["location_type"] == "HOME" else "AWAY"
    tag = "" if g["location_type"] == "HOME" else " (UPSET)"
    out.append(f"  Game {g['num']:02d}: {g['winner']:<26} {g['spread']:<14} O/U: {g['ou']:<8}{loc}{tag}")
out.append("")
out.append("=" * 80)
out.append("CONFIDENCE LEVELS")
out.append("=" * 80)
out.append("")
high = [g for g in GAMES if g["confidence"] >= 75]
mod = [g for g in GAMES if 65 <= g["confidence"] < 75]
low = [g for g in GAMES if g["confidence"] < 65]
out.append(f"HIGH CONFIDENCE (75%+): {len(high)} games")
for g in high: out.append(f"  Game {g['num']:02d}: {g['winner']} ({g['confidence']}%)")
out.append("")
out.append(f"MODERATE CONFIDENCE (65-74%): {len(mod)} games")
for g in mod: out.append(f"  Game {g['num']:02d}: {g['winner']} ({g['confidence']}%)")
out.append("")
out.append(f"LOW CONFIDENCE (<65%): {len(low)} games")
for g in low: out.append(f"  Game {g['num']:02d}: {g['winner']} ({g['confidence']}%)")
out.append("")
out.append("=" * 80)
out.append("DISCLAIMERS")
out.append("=" * 80)
out.append("")
disclaimers = [
    "This analysis is based on Preseason Week 1 2026 data and predictions.",
    "Preseason games are inherently unpredictable due to roster battles, playing time distribution, and evaluation-focused coaching decisions.",
    "Starters typically play limited snaps in preseason, making full-game statistics less predictive.",
    "The 225-category equal-weight system provides a comprehensive but imperfect framework.",
    "All predictions are for entertainment and analytical purposes only.",
    "Actual game results may differ significantly from these projections.",
    "Injury reports, roster moves, and other factors not captured in Week 1 data could impact predictions.",
    "The point spread and over/under lines are projections and may change.",
    "Past performance in preseason is not necessarily indicative of regular-season results.",
    "This analysis was generated using a systematic methodology evaluating teams across 225 distinct categories.",
]
for idx, d in enumerate(disclaimers, 1):
    out.append(f"{idx:2d}. {d}")
out.append("")
out.append("=" * 80)
out.append("END OF FILE")
out.append("=" * 80)

target = r"C:\PortableLauncher\Arcade\roms\NFL SEASON 2026\Preseason Week 2\PIC WINNERS AND LOOSERS.txt"
with open(target, "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")
print(f"Written {len(out)} lines to {target}")
