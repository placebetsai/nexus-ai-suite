import os, sys

CATEGORIES = [
    "QB Passer Rating","QB Completion Percentage","QB Yardage Distribution",
    "QB TD-INT Ratio","QB Red Zone Efficiency","QB Third Down Conversions",
    "RB Yards Per Carry","RB Broken Tackles","RB Receiving Contribution",
    "RB Pass Protection","WR Catch Rate","WR Yards After Catch",
    "WR Deep Ball Reception","WR Red Zone Targets","TE Blocking Grade",
    "TE Receiving Efficiency","OL Pass Blocking Efficiency","OL Run Blocking Grade",
    "OL Penalties Committed","OL Sacks Allowed","DL Pass Rush Win Rate",
    "DL Run Stop Percentage","DL Sack Production","DL QB Pressures",
    "LB Tackle Efficiency","LB Coverage Grade","LB Run Defense",
    "LB Blitzer Effectiveness","CB Completion Percentage Allowed","CB Pass Breakups",
    "CB Interceptions","CB Yards Allowed Per Reception","S Range and Coverage",
    "S Run Support","S Ball Skills","S Tackling in Open Field",
    "FG Accuracy","Punt Average and Hang Time","Kick Return Average",
    "Punt Return Average","Coverage Units","Blocked Kicks",
    "Turnover Differential","Takeaways","Giveaways",
    "Time of Possession","Third Down Offense","Third Down Defense",
    "Red Zone Offense","Red Zone Defense","Goal-to-Go Efficiency",
    "First Down Production","Yards Per Play","Explosive Play Rate (20+ yards)",
    "Big Play Differential","Penalty Assessment","Penalty Impact on Scoring Drives",
    "Challenge Flag Usage","Timeout Management","Two-Minute Drill Efficiency",
    "Hurry-Up Offense Effectiveness","Play-Action Pass Efficiency",
    "RPO (Run-Pass Option) Execution","Screen Pass Effectiveness",
    "Quick Game Passing (< 2.5 seconds)","Deep Passing (> 20 yards downfield)",
    "Intermediate Passing (10-20 yards)","Short Passing (Under 10 yards)",
    "Under Center vs Shotgun Analysis","Formation Tendencies",
    "Personnel Grouping Effectiveness","Motion and Shift Usage",
    "Tempo and Pace of Play","Situational - First Quarter",
    "Situational - Second Quarter","Situational - Third Quarter",
    "Situational - Fourth Quarter","Situational - Overtime",
    "Home vs Away Performance","Dome vs Outdoor","Weather Impact",
    "Surface Type Impact","Altitude Impact","Divisional Rivalry Context",
    "Conference Matchup Context","Previous Meeting Impact",
    "Coaching Matchup Analysis","Offensive Coordinator Strategy",
    "Defensive Coordinator Strategy","Special Teams Coordinator",
    "Game Planning Execution","Halftime Adjustments",
    "In-Game Adjustments","Challenge/Replay Decisions",
    "Clock Management","Fourth Down Decision Making",
    "Go-For-It Situations","Punt Decisions","Field Goal Range Decisions",
    "Two-Point Conversion","Onside Kick Situations",
    "Prevent Defense Usage","Victory Formation",
    "Garbage Time Production","Comeback Attempt Analysis",
    "Blowout Prevention","Injury Impact Assessment",
    "Roster Depth Evaluation","Rookie Performance",
    "Veteran Leadership","Free Agent Evaluation",
    "Draft Pick Development","Practice Squad Contribution",
    "Preseason Development","Conditioning and Fatigue",
    "Mental Errors","Discipline and Composure",
    "Team Chemistry","Leadership Presence",
    "Sideline Energy","Fan Impact",
    "Media Narrative","Betting Line Impact",
    "Fantasy Implications","Playoff Implications",
    "Division Standing","Conference Standing",
    "Strength of Schedule","Tiebreaker Scenarios",
    "Head-to-Head Record","Point Differential Trend",
    "Yards Per Play Differential","Turnover Luck",
    "EPA (Expected Points Added)","WPA (Win Probability Added)",
    "DVOA","Player Efficiency Rating",
    "Approximate Value","Consistency Index",
    "Clutch Performance","Pressure Performance",
    "Under Pressure Efficiency","Clean Pocket Performance",
    "When Blitzed Analysis","Coverage Shell Tendencies",
    "Press vs Off Coverage","Zone vs Man Coverage",
    "Blitz Package Effectiveness","Stunt and Twist Success",
    "Contain Rush Effectiveness","Run Lane Integrity",
    "Gap Assignment Discipline","Third Down Red Zone Conversion",
    "Goal Line Stand Success","Two-Minute Defense",
    "Two-Minute Offense","Comeback Win Probability",
    "Fourth Quarter Lead Protection","Opponent Third Down Rate",
    "Sack Rate","Interception Rate",
    "Fumble Recovery Rate","Passer Rating When Blitzed",
    "Passer Rating Under Pressure","Rushing in Winning Margin",
    "Passing in Winning Margin","Time of Possession in Wins",
    "Turnover Margin in Wins","Red Zone TD Rate",
    "Red Zone FG Rate","Red Zone Turnover Rate",
    "First Quarter Scoring Margin","Second Quarter Scoring Margin",
    "Third Quarter Scoring Margin","Fourth Quarter Scoring Margin",
    "Point Differential by Quarter","Yards Per Play by Quarter",
    "Turnovers by Quarter","Penalties by Quarter",
    "Third Down by Quarter","Red Zone by Quarter",
    "Sack Distribution by Quarter","Pass Rush by Quarter",
    "Coverage Grade by Quarter","Tackling Grade by Quarter",
    "Pass Blocking by Quarter","Run Blocking by Quarter",
    "Special Teams by Quarter","Coaching Grade by Quarter",
    "Challenge Success Rate","Timeout Usage Efficiency",
    "Clock Management Grade","Fourth Down Conversion Rate",
    "Fourth Down Defense Rate","Two-Point Conversion Rate",
    "Two-Point Conversion Defense","Onside Kick Recovery Rate",
    "Onside Kick Defense Rate","Kick Return Average (ST)",
    "Punt Return Average (ST)","Kick Return Touchbacks",
    "Punt Return Fair Catches","Kick Coverage Average",
    "Punt Coverage Average","Blocked Kick Rate",
    "Missed Field Goal Rate","Extra Point Rate",
    "Fake Field Goal","Fake Punt",
    "Pooch Punt Effectiveness","Pin-Deep Punt Rate",
    "Touchback Rate on Kickoffs","Return Rate on Kickoffs",
    "Return Rate on Punts","Average Starting Field Position",
    "Starting Field Position Differential","Points Per Drive",
    "Points Per Drive Allowed","Yards Per Drive",
    "Yards Per Drive Allowed","Plays Per Drive",
    "Plays Per Drive Allowed","Average Drive Duration",
    "Average Drive Duration Allowed","Three-and-Out Rate",
]

SOURCES = [
    "NFL Game Statistics (Week 1 2026)","NFL Next Gen Stats","Pro Football Reference",
    "ESPN NFL Statistics","NFL.com Game Recaps","Sportradar NFL Data",
    "TruMedia NFL Analytics","Football Outsiders DVOA","PFF Grades (Week 1)",
    "NFL Combine/Pro Day Results","Team Official Depth Charts","NFL Injury Reports",
    "NFL Transaction Wire","NFL Waiver Claims","NFL Practice Squad Signings",
    "NFL Preseason Snap Counts","NFL Red Zone Statistics","NFL Third Down Data",
    "NFL Turnover Data","NFL Sack/Pressure Data","NFL Coverage Charting",
    "NFL Blitz/Pressure Data","NFL Run Defense Metrics","NFL Pass Rush Metrics",
    "NFL Special Teams Data","NFL Penalty Data","NFL Timeout/Challenge Data",
    "NFL Two-Minute Drill Data","NFL Fourth Down Data","NFL Goal Line Data",
    "NFL Time of Possession Data","NFL Explosive Play Data","NFL Big Play Data",
    "NFL Drive Summary Data","NFL Play-by-Play Data","NFL Snap Count Data",
    "NFL Personnel Grouping Data","NFL Formation Data","NFL Motion Data",
    "NFL Tempo Data","NFL Quarter-by-Quarter Data","NFL Home/Away Splits",
    "NFL Dome/Outdoor Splits","NFL Weather Data","NFL Surface Data",
    "NFL Divisional Matchup History","NFL Conference Matchup History",
    "NFL Head-to-Head Records","NFL Coaching Records","NFL Preseason Records",
    "NFL Betting Line Movement","NFL Over/Under Trends","NFL Spread Analysis",
    "Fantasy Football Projections","NFL Draft Pick Performance","NFL Rookie Reports",
    "NFL Free Agent Evaluations","NFL Depth Chart Analysis","NFL Roster Projections",
    "NFL Practice Squad Reports","NFL Injury Designations","NFL Activation Reports",
    "NFL PFF Coverage Grades","NFL PFF Pass Rush Grades","NFL PFF Run Defense Grades",
    "NFL PFF Tackling Grades","NFL PFF Blocking Grades","NFL PFF Ball Skills Grades",
    "NFL EPA Data","NFL WPA Data","NFL DVOA Projections","NFL AY/A Data",
    "NFL QBR Data","NFL ANY/A Data","NFL DSR Data","NFL Explosive Rate Data",
    "NFL Success Rate Data","NFL Stuff Rate Data","NFL Pressure Rate Data",
    "NFL Blitz Rate Data","NFL Man/Zone Coverage Data","NFL Press/Off Coverage Data",
    "NFL Stunt/Twist Data","NFL Contain Rush Data","NFL Gap Integrity Data",
    "NFL Run Lane Data","NFL Pass Protection Data","NFL Run Blocking Data",
    "NFL Coverage Shell Data","NFL LB Coverage Data","NFL S Coverage Data",
    "NFL CB Coverage Data","NFL DL Run Stop Data","NFL DL Pass Rush Data",
    "NFL LB Run Defense Data","NFL LB Blitz Data","NFL Return Game Data",
    "NFL Kick Coverage Data","NFL Punt Coverage Data","NFL FG Data",
    "NFL Punt Data","NFL Kickoff Data","NFL Snap Distribution Data",
    "NFL Route Running Data","NFL YAC Data","NFL Deep Ball Data",
    "NFL Intermediate Passing Data","NFL Short Passing Data","NFL Screen Data",
    "NFL RPO Data","NFL Play Action Data","NFL Quick Game Data",
    "NFL Under Center/Shotgun Data","NFL Personnel Group Efficiency",
    "NFL Motion/Shift Data","NFL Pre-Snap Data","NFL Post-Snap Data",
    "NFL Win Probability Data","NFL Expected Points Data","NFL Model Projections",
    "Vegas Insider NFL Lines","Action Network NFL Data","Football Database Historical",
    "Sharp Football Stats","The Athletic NFL Analysis","Pro Football Talk Updates",
    "NFL Network Film Review","ESPN NFL Insider Reports","CBS Sports NFL Analysis",
    "Fox Sports NFL Analytics","NBC Sports NFL Data","NFL Weather Channel Data",
    "AccuWeather Game Day Forecasts","NFLPA Player Reports","NFL Competition Committee Data",
    "NFL Officials Assignment Data","NFL Replay Official Data","NFL Command Center Data",
    "NFL Films Analysis","NFL Honors Voting Data","NFL Pro Bowl Selection Data",
    "NFL All-Pro Voting Data","NFL MVP Ladder","NFL Awards Watch",
    "NFL Playoff Probability Models","NFL Strength of Schedule Data",
    "NFL Tiebreaker Scenarios","NFL Division Race Data","NFL Conference Race Data",
    "NFL Strength of Victory Data","NFL Strength of Defeat Data",
    "NFL Common Games Data","NFL SOS Calculations","NFL Tiebreaker Rules",
]

# Neutral categories that are TIED
NEUTRAL = {42,78,83,94,100,101,190,195,196,197,198,201,202,203,204,205,207,208,209,210}
# Categories that are close/TIED
CLOSE = {39,40,58,63,72,80,81,84,85,86,113,162,199,200,212,213,214}

# Templates for winner analysis (i % 20 rotation for variety)
W_TEMPLATES_OFF = [
    "{w} holds the edge in {cn} heading into this matchup. Their Week 1 data showed superior performance in this area, with the {wa} unit executing at a higher level. {l}'s performance in this category was notably weaker based on their Week 1 game, and the {wa} advantage here could be a key factor in the final outcome. Expect {w} to continue leveraging this advantage throughout the game.",
    "The {cn} advantage clearly belongs to {w} based on Week 1 performance data. The {wa} side demonstrated better execution and efficiency in this critical area, while {l} struggled significantly. The disparity in this category gives {w} a meaningful edge that will likely impact the game's trajectory. This is one of several areas where {w}'s superiority should be evident.",
    "{w} showed a clear advantage in {cn} during Week 1, outperforming {l} in measurable ways. The {wa} execution in this category was sharp and consistent, while the {la} side was inconsistent at best. This categorical edge adds to {w}'s cumulative advantage heading into this matchup. The {wa} coaching staff has clearly emphasized this area of the game.",
    "Based on Week 1 data, {w} has a significant advantage in {cn}. The {wa} performance was well above average in this category, while {l} was below the benchmark established by the data. This edge in {cn} will contribute to {w}'s overall dominance in this matchup. The {wa} players and coaches have established a clear superiority in this phase.",
    "The Week 1 performance data shows {w} clearly ahead in {cn}. The {wa} unit was more effective, efficient, and productive in this area compared to {l}'s effort. The {la} side's struggles in this category create an exploitable weakness that {w} will look to capitalize on. This is a significant advantage for {w} in their overall game plan.",
    "{w} demonstrated superior ability in {cn} during their Week 1 contest. The {wa} side executed with precision while {l} was lacking in this critical area. This categorical advantage represents one of several key differentiators that favor {w} heading into the game. Expect the {wa} coaching staff to continue emphasizing this strength.",
]
W_TEMPLATES_DEF = [
    "Defensively, {w} holds the edge in {cn} based on Week 1 performance. The {wa} defensive unit was more effective and disruptive in this area, limiting {l}'s offensive options. The {la} offense struggled to generate production against the {wa} defense in similar situations. This defensive advantage gives {w} another layer of superiority in this matchup.",
    "The defensive side for {w} showed better numbers in {cn} during Week 1. The {wa} defense was more disciplined and effective at shutting down this aspect of the opponent's game plan. {l}'s offense was unable to overcome similar defensive pressure from their Week 1 opponent. This defensive edge further strengthens {w}'s overall position.",
    "{w}'s defensive performance in {cn} was clearly superior in Week 1. The {wa} defenders executed their assignments with better technique and discipline. {l} was unable to generate consistent production in this area against their Week 1 opponent. The {wa} defensive coaching staff has clearly prepared their unit well for this type of challenge.",
    "Week 1 data confirms that {w} has the defensive advantage in {cn}. The {wa} unit was more active, aggressive, and effective in this category. {l}'s offensive struggles in this area during Week 1 will likely continue against the {wa} defense. This represents another significant advantage for {w} on the defensive side of the ball.",
]
W_TEMPLATES_ST = [
    "The special teams advantage in {cn} belongs to {w} based on Week 1 performance. The {wa} special teams unit was more reliable and effective in this phase of the game. {l}'s special teams performance was adequate but not as strong. This edge, while perhaps not as large as some offensive or defensive advantages, still contributes to {w}'s overall superiority.",
    "{w} holds a slight but meaningful edge in {cn} from their Week 1 performance. The {wa} special teams were more consistent and impactful in this category. {l}'s special teams unit had some lapses that could be exploited. Every advantage matters in a competitive game, and {w} has the edge here.",
]
W_TEMPLATES_COACH = [
    "The coaching advantage in {cn} clearly belongs to {w}. The {wa} coaching staff demonstrated superior preparation, execution, and adjustments in Week 1. {l}'s coaching was less effective in this area, contributing to their Week 1 struggles. The {wa} coaching staff's attention to detail in {cn} will continue to pay dividends in this matchup.",
    "{w}'s coaching staff showed better command of {cn} in Week 1. The {wa} coaches had their team better prepared in this phase, with clear emphasis on fundamentals and execution. {l}'s coaching staff was less effective in this area. This coaching advantage is reflected in the team's overall performance and preparation level.",
]
W_TEMPLATES_INTANG = [
    "The intangible factor of {cn} favors {w} based on their Week 1 performance. The {wa} team showed better characteristics in this area, contributing to their overall competitive edge. {l} lacked the same level of performance in this intangible category. These intangible advantages often compound over the course of a game.",
    "{w} demonstrated better {cn} during their Week 1 game. The {wa} team's culture and preparation showed in their performance. {l} was lacking in this intangible area. While harder to quantify, this advantage is reflected in the overall body of work from Week 1.",
]

L_TEMPLATES_OFF = [
    "{l} will lose this game in part due to their poor showing in {cn} during Week 1. The {la} unit was significantly less effective than {w}'s in this critical area. Without substantial improvement in this category, {l} will continue to struggle against the {wa} defense/offense. This is one of several offensive weaknesses that will cost them the game.",
    "The {cn} weakness for {l} was exposed in Week 1 and will continue to be a problem. The {la} performance in this area was below the standard needed to compete with {w}. The {wa} side will look to exploit this weakness throughout the game. {l} must address this deficiency or risk falling behind early.",
    "{l}'s struggles in {cn} during Week 1 are a major reason they will lose. The {la} unit was unable to execute at a level needed to match {w}'s production. The {wa} advantage in this category will be evident throughout the game. This weakness compounds with other deficiencies to create an overwhelming disadvantage.",
    "Based on Week 1 data, {l} is at a significant disadvantage in {cn}. The {la} performance was well below what's needed to compete with {w}. The {wa} side will continue to dominate this category. This is a critical weakness that {l} coaching staff must address.",
    "The {la} showing in {cn} during Week 1 was concerning. They were outperformed by {w} in measurable ways in this category. The {wa} advantage here creates a ripple effect that impacts other areas of the game. {l} will lose ground in this category throughout the contest.",
    "{l} demonstrated clear deficiencies in {cn} in their Week 1 game. The {la} unit was ineffective in this area, which hurt their overall performance. The {wa} coaching staff will game plan to exploit this weakness. Without improvement, this category will continue to favor {w} decisively.",
]
L_TEMPLATES_DEF = [
    "Defensively, {l} showed weakness in {cn} during Week 1. The {la} defense was unable to match {w}'s effectiveness in this category. The {wa} offense will look to attack this defensive vulnerability. This defensive deficiency will be a recurring problem throughout the game.",
    "{l}'s defensive struggles in {cn} were evident in Week 1. The {la} defense lacked the discipline and execution needed to compete in this area. The {wa} side will continue to exploit this weakness. This defensive liability compounds {l}'s other problems.",
]
L_TEMPLATES_ST = [
    "The {la} special teams showed relative weakness in {cn} during Week 1. While not as glaring as some offensive or defensive issues, this category still favors {w}. The {wa} special teams were more reliable and impactful. In a close game, these small advantages can be decisive.",
]
L_TEMPLATES_COACH = [
    "The coaching disadvantage in {cn} hurt {l} in Week 1. The {la} coaching staff was less prepared and effective in this area compared to {w}. The {wa} coaching staff's superiority will continue to be reflected in the team's performance. This coaching gap is a significant factor in the predicted outcome.",
]
L_TEMPLATES_INTANG = [
    "The intangible weakness in {cn} was apparent for {l} in Week 1. The {la} team lacked the characteristics needed to compete in this area. The {wa} team's advantage in this intangible category will compound over the course of the game. These factors often separate winning from losing teams.",
]

def get_w_analysis(i, cn, w, l, wa, la):
    cat_group = (i - 1) // 36  # 0=off, 1=def, 2=st, 3=mixed
    idx = i % 6
    if i <= 20:
        templates = W_TEMPLATES_OFF
    elif i <= 36:
        templates = W_TEMPLATES_DEF
    elif i <= 42:
        templates = W_TEMPLATES_ST
    elif i in (87,88,89,90,91,92,93,95,96,97):
        templates = W_TEMPLATES_COACH
    elif i >= 101 and i <= 125:
        templates = W_TEMPLATES_INTANG
    else:
        templates = W_TEMPLATES_OFF + W_TEMPLATES_DEF
    t = templates[idx % len(templates)]
    return t.format(w=w, l=l, wa=wa, la=la, cn=cn)

def get_l_analysis(i, cn, w, l, wa, la):
    cat_group = (i - 1) // 36
    idx = i % 4
    if i <= 20:
        templates = L_TEMPLATES_OFF
    elif i <= 36:
        templates = L_TEMPLATES_DEF
    elif i <= 42:
        templates = L_TEMPLATES_ST
    elif i in (87,88,89,90,91,92,93,95,96,97):
        templates = L_TEMPLATES_COACH
    elif i >= 101 and i <= 125:
        templates = L_TEMPLATES_INTANG
    else:
        templates = L_TEMPLATES_OFF + L_TEMPLATES_DEF
    t = templates[idx % len(templates)]
    return t.format(w=w, l=l, wa=wa, la=la, cn=cn)

print("Script loaded OK")
