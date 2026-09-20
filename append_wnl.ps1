$outFile = "C:\PortableLauncher\Arcade\roms\NFL SEASON 2026\Preseason Week 1\WINNERS AND LOOSERS.txt"
$sw = [System.IO.StreamWriter]::new($outFile, $true, [System.Text.Encoding]::UTF8, 65536)
function W([string]$s){ $sw.WriteLine($s) }

W ""
W "==========================================================="
W "DETAILED PLAYER STATISTICS - PRESEASON WEEK 1"
W "==========================================================="
W ""

$games = @(
@{num="01";wn="BENGALS";ln="LIONS";ws=16;ls=14;wt="Cincinnati Bengals";lt="Detroit Lions";loc="Paycor Stadium";wqb="Jake Browning";wqb2="Trevor Siemian";lqb="Jared Goff";lqb2="Hendon Hooker";wrb="Chase Brown";lrb="David Montgomery";wwr1="Andrei Iosivas";lwr1="Jameson Williams";wte="Drew Sample";lte="Sam LaPorta";wpy=247;lpy=211;wry=95;lry=82;wrz="2/3";lrz="1/3";wfg="3/3";lfg="2/3";wpen=5;wpeny=35;lpen=7;lpeny=55;wsb=3;lsb=1;wtd="5/11";ltd="4/12"},
@{num="02";wn="STEELERS";ln="PACKERS";ws=28;ls=9;wt="Pittsburgh Steelers";lt="Green Bay Packers";loc="Acrisure Stadium";wqb="Aaron Rodgers";wqb2="Mason Rudolph";lqb="Malik Willis";lqb2="Sean Clifford";wrb="Najee Harris";lrb="Emanuel Wilson";wwr1="George Pickens";lwr1="Jayden Reed";wte="Pat Freiermuth";lte="Tucker Kraft";wpy=284;lpy=178;wry=138;lry=67;wrz="3/4";lrz="0/2";wfg="1/1";lfg="3/3";wpen=4;wpeny=30;lpen=8;lpeny=65;wsb=4;lsb=0;wtd="7/13";ltd="3/12"},
@{num="03";wn="COLTS";ln="PATRIOTS";ws=13;ls=13;wt="Indianapolis Colts";lt="New England Patriots";loc="Gillette Stadium";wqb="Anthony Richardson";wqb2="Sam Ehlinger";lqb="Drake Maye";lqb2="Joe Milton III";wrb="Jonathan Taylor";lrb="Rhamondre Stevenson";wwr1="Michael Pittman Jr.";lwr1="DeVante Parker";wte="Mo Alie-Cox";lte="Hunter Henry";wpy=198;lpy=226;wry=112;lry=89;wrz="1/2";lrz="1/3";wfg="2/2";lfg="2/2";wpen=6;wpeny=45;lpen=5;lpeny=40;wsb=2;lsb=2;wtd="4/11";ltd="5/12"},
@{num="04";wn="CHARGERS";ln="TEXANS";ws=27;ls=7;wt="Los Angeles Chargers";lt="Houston Texans";loc="NRG Stadium";wqb="Justin Herbert";wqb2="Easton Stick";lqb="C.J. Stroud";lqb2="Davis Mills";wrb="Gus Edwards";lrb="Joe Mixon";wwr1="Ladd McConkey";lwr1="Nico Collins";wte="Will Dissly";lte="Dalton Schultz";wpy=278;lpy=186;wry=142;lry=74;wrz="3/4";lrz="1/3";wfg="2/2";lfg="0/0";wpen=3;wpeny=20;lpen=7;lpeny=55;wsb=5;lsb=1;wtd="8/14";ltd="3/11"},
@{num="05";wn="CARDINALS";ln="RAIDERS";ws=27;ls=14;wt="Arizona Cardinals";lt="Las Vegas Raiders";loc="Allegiant Stadium";wqb="Kyler Murray";wqb2="Clayton Tune";lqb="Gardner Minshew";lqb2="Aidan O'Connell";wrb="James Conner";lrb="Alexander Mattison";wwr1="Marvin Harrison Jr.";lwr1="Davante Adams";wte="Trey McBride";lte="Brock Bowers";wpy=256;lpy=224;wry=118;lry=86;wrz="3/4";lrz="2/4";wfg="2/2";lfg="0/0";wpen=5;wpeny=38;lpen=6;lpeny=50;wsb=3;lsb=2;wtd="6/12";ltd="4/11"},
@{num="06";wn="TITANS";ln="49ERS";ws=19;ls=13;wt="Tennessee Titans";lt="San Francisco 49ers";loc="Levi's Stadium";wqb="Will Levis";wqb2="Mason Rudolph";lqb="Brock Purdy";lqb2="Joshua Dobbs";wrb="Tony Pollard";lrb="Jordan Mason";wwr1="DeAndre Hopkins";lwr1="Deebo Samuel";wte="Chigoziem Okonkwo";lte="George Kittle";wpy=214;lpy=232;wry=108;lry=78;wrz="2/3";lrz="1/3";wfg="3/3";lfg="2/2";wpen=4;wpeny=30;lpen=6;lpeny=48;wsb=3;lsb=2;wtd="5/11";ltd="4/12"},
@{num="07";wn="BRONCOS";ln="FALCONS";ws=27;ls=7;wt="Denver Broncos";lt="Atlanta Falcons";loc="Mercedes-Benz Stadium";wqb="Bo Nix";wqb2="Zach Wilson";lqb="Kirk Cousins";lqb2="Michael Penix Jr.";wrb="Javonte Williams";lrb="Bijan Robinson";wwr1="Courtland Sutton";lwr1="Drake London";wte="Greg Dulcich";lte="Kyle Pitts";wpy=262;lpy=174;wry=128;lry=72;wrz="3/3";lrz="1/2";wfg="2/2";lfg="0/0";wpen=4;wpeny=32;lpen=8;lpeny=68;wsb=4;lsb=1;wtd="7/13";ltd="3/11"},
@{num="08";wn="BUCCANEERS";ln="JETS";ws=24;ls=16;wt="Tampa Bay Buccaneers";lt="New York Jets";loc="MetLife Stadium";wqb="Kyle Trask";wqb2="John Wolford";lqb="Geno Smith";lqb2="Tyrod Taylor";wrb="Rachaad White";lrb="Breece Hall";wwr1="Mike Evans";lwr1="Garrett Wilson";wte="Cade Otton";lte="Tyler Conklin";wpy=238;lpy=218;wry=114;lry=92;wrz="2/3";lrz="1/3";wfg="2/2";lfg="3/3";wpen=5;wpeny=40;lpen=6;lpeny=48;wsb=3;lsb=2;wtd="6/12";ltd="4/11"},
@{num="09";wn="COMMANDERS";ln="DOLPHINS";ws=20;ls=7;wt="Washington Commanders";lt="Miami Dolphins";loc="Northwest Stadium";wqb="Jayden Daniels";wqb2="Marcus Mariota";lqb="Tua Tagovailoa";lqb2="Tyler Huntley";wrb="Austin Ekeler";lrb="De'Von Achane";wwr1="Terry McLaurin";lwr1="Tyreek Hill";wte="Zach Ertz";lte="Durham Smythe";wpy=242;lpy=196;wry=124;lry=84;wrz="2/3";lrz="1/2";wfg="2/2";lfg="0/0";wpen=4;wpeny=30;lpen=7;lpeny=58;wsb=3;lsb=1;wtd="6/11";ltd="3/10"},
@{num="10";wn="BILLS";ln="PANTHERS";ws=29;ls=14;wt="Buffalo Bills";lt="Carolina Panthers";loc="Highmark Stadium";wqb="Josh Allen";wqb2="Mitchell Trubisky";lqb="Bryce Young";lqb2="Andy Dalton";wrb="James Cook";lrb="Chuba Hubbard";wwr1="Keon Coleman";lwr1="Adam Thielen";wte="Dalton Kincaid";lte="Tommy Tremble";wpy=248;lpy=186;wry=116;lry=78;wrz="3/4";lrz="1/2";wfg="2/2";lfg="1/1";wpen=4;wpeny=32;lpen=6;lpeny=48;wsb=3;lsb=1;wtd="7/12";ltd="3/10"},
@{num="11";wn="BEARS";ln="BROWNS";ws=34;ls=10;wt="Chicago Bears";lt="Cleveland Browns";loc="Soldier Field";wqb="Caleb Williams";wqb2="Tyson Bagent";lqb="Deshaun Watson";lqb2="Shedeur Sanders";wrb="D'Andre Swift";lrb="Nick Chubb";wwr1="DJ Moore";lwr1="Amari Cooper";wte="Cole Kmet";lte="David Njoku";wpy=298;lpy=168;wry=156;lry=64;wrz="4/5";lrz="1/3";wfg="2/2";lfg="1/1";wpen=3;wpeny=22;lpen=8;lpeny=70;wsb=5;lsb=0;wtd="8/14";ltd="2/11"},
@{num="12";wn="VIKINGS";ln="GIANTS";ws=13;ls=10;wt="Minnesota Vikings";lt="New York Giants";loc="MetLife Stadium";wqb="Sam Darnold";wqb2="Nick Mullens";lqb="Daniel Jones";lqb2="Tommy DeVito";wrb="Aaron Jones";lrb="Devin Singletary";wwr1="Justin Jefferson";lwr1="Malik Nabers";wte="T.J. Hockenson";lte="Darren Waller";wpy=208;lpy=194;wry=98;lry=88;wrz="1/2";lrz="1/3";wfg="2/2";lfg="1/2";wpen=4;wpeny=28;lpen=5;lpeny=42;wsb=2;lsb=1;wtd="5/12";ltd="4/11"},
@{num="13";wn="RAMS";ln="CHIEFS";ws=20;ls=12;wt="Los Angeles Rams";lt="Kansas City Chiefs";loc="GEHA Field at Arrowhead";wqb="Ty Simpson";wqb2="Jimmy Garoppolo";lqb="Justin Fields";lqb2="Gardner Minshew";wrb="Kyren Williams";lrb="Isiah Pacheco";wwr1="Puka Nacua";lwr1="Xavier Worthy";wte="Colby Parkinson";lte="Travis Kelce";wpy=234;lpy=198;wry=112;lry=76;wrz="2/3";lrz="1/4";wfg="2/2";lfg="2/3";wpen=4;wpeny=30;lpen=6;lpeny=50;wsb=3;lsb=2;wtd="5/12";ltd="3/11"},
@{num="14";wn="JAGUARS";ln="SAINTS";ws=24;ls=20;wt="Jacksonville Jaguars";lt="New Orleans Saints";loc="Caesars Superdome";wqb="Trevor Lawrence";wqb2="Mac Jones";lqb="Spencer Rattler";lqb2="Jake Haener";wrb="Travis Etienne Jr.";lrb="Alvin Kamara";wwr1="Brian Thomas Jr.";lwr1="Chris Olave";wte="Evan Engram";lte="Juwan Johnson";wpy=256;lpy=242;wry=104;lry=92;wrz="3/4";lrz="2/4";wfg="1/1";lfg="2/3";wpen=5;wpeny=38;lpen=5;lpeny=40;wsb=2;lsb=2;wtd="6/12";ltd="5/12"},
@{num="15";wn="RAVENS";ln="EAGLES";ws=24;ls=7;wt="Baltimore Ravens";lt="Philadelphia Eagles";loc="M&T Bank Stadium";wqb="Lamar Jackson";wqb2="Josh Johnson";lqb="Jalen Hurts";lqb2="Kenny Pickett";wrb="Derrick Henry";lrb="Saquon Barkley";wwr1="Zay Flowers";lwr1="A.J. Brown";wte="Mark Andrews";lte="Dallas Goedert";wpy=274;lpy=172;wry=136;lry=68;wrz="3/4";lrz="1/3";wfg="2/2";lfg="0/1";wpen=3;wpeny=25;lpen=7;lpeny=60;wsb=4;lsb=0;wtd="7/13";ltd="2/10"},
@{num="16";wn="COWBOYS";ln="SEAHAWKS";ws=17;ls=7;wt="Dallas Cowboys";lt="Seattle Seahawks";loc="Lumen Field";wqb="Sam Howell";wqb2="Joe Milton III";lqb="Geno Smith";lqb2="Sam Howell";wrb="Rico Dowdle";lrb="Kenneth Walker III";wwr1="CeeDee Lamb";lwr1="DK Metcalf";wte="Jake Ferguson";lte="Noah Fant";wpy=218;lpy=182;wry=106;lry=72;wrz="2/3";lrz="1/3";wfg="2/2";lfg="0/1";wpen=5;wpeny=38;lpen=6;lpeny=48;wsb=3;lsb=1;wtd="5/11";ltd="3/10"}
)

foreach($g in $games) {
    W ""
    W ("===========================================================")
    W ("DETAILED PLAYER STATS - GAME {0}: {1} {2}, {3} {4}" -f $g.num, $g.wn, $g.ws, $g.ln, $g.ls)
    W ("===========================================================")
    W ""
    W "PASSING"
    W ("  {0} Passing:" -f $g.wt)
    W ("    {0}: 12/18, 164 yards, 1 TD, 0 INT, 102.4 passer rating" -f $g.wqb)
    W ("    {0}: 6/10, {1} yards, 0 TD, 0 INT, 82.1 passer rating" -f $g.wqb2, ($g.wpy - 164))
    W ("  {0} Passing:" -f $g.lt)
    W ("    {0}: 10/17, {1} yards, 1 TD, {2} INT(s), 78.3 passer rating" -f $g.lqb, ($g.lpy - 40), [math]::Max(0, [math]::Ceiling(($g.lpy - 120)/80)))
    W ("    {0}: 5/9, 40 yards, 0 TD, 0 INT, 72.6 passer rating" -f $g.lqb2)
    W ""
    W "RUSHING"
    W ("  {0} Rushing:" -f $g.wt)
    $wr1y = [math]::Floor($g.wry * 0.46)
    W ("    {0}: 12 carries, {1} yards, 0 TD, long 14, 4.7 YPC" -f $g.wrb, $wr1y)
    W ("    RB2: 10 carries, {0} yards, 0 TD, long 11, {1} YPC" -f ($g.wry - $wr1y), [math]::Round(($g.wry - $wr1y)/10, 1))
    W ("  {0} Rushing:" -f $g.lt)
    $lr1y = [math]::Floor($g.lry * 0.48)
    W ("    {0}: 11 carries, {1} yards, 0 TD, long 12, {2} YPC" -f $g.lrb, $lr1y, [math]::Round($lr1y/11, 1))
    W ("    RB2: 9 carries, {0} yards, 0 TD, long 9, {1} YPC" -f ($g.lry - $lr1y), [math]::Round(($g.lry - $lr1y)/9, 1))
    W ""
    W "RECEIVING"
    W ("  {0} Receiving:" -f $g.wt)
    W ("    {0}: 5 catches, 68 yards, 1 TD, long 24, 13.6 avg" -f $g.wwr1)
    W ("    WR2: 4 catches, 52 yards, 0 TD, long 18, 13.0 avg")
    W ("    {0}: 3 catches, 38 yards, 0 TD, long 14, 12.7 avg" -f $g.wte)
    W ("    RB: 3 catches, 24 yards, 0 TD, long 11, 8.0 avg")
    W ("    Other: 3 catches, 28 yards, 0 TD, long 9")
    W ("  {0} Receiving:" -f $g.lt)
    W ("    {0}: 4 catches, 48 yards, 0 TD, long 19, 12.0 avg" -f $g.lwr1)
    W ("    WR2: 3 catches, 34 yards, 0 TD, long 15, 11.3 avg")
    W ("    {0}: 3 catches, 28 yards, 0 TD, long 12, 9.3 avg" -f $g.lte)
    W ("    RB: 3 catches, 22 yards, 0 TD, long 9, 7.3 avg")
    W ("    Other: 2 catches, 16 yards, 0 TD")
    W ""
    W "DEFENSIVE LEADERS"
    W ("  {0} Defense:" -f $g.wt)
    W ("    Leading Tackler: MLB - 8 total tackles (5 solo, 3 assists)")
    W ("    Sacks: {0} total (DE 1.5, DT 1.0, OLB 0.5)" -f $g.wsb)
    W ("    Interceptions: 1 (CB, 18-yard return)")
    W ("    Pass Breakups: 4 (CB 2, S 1, OLB 1)")
    W ("    QB Hits: 6")
    W ("    Tackles for Loss: 4 (DE 2, MLB 1, OLB 1)")
    W ("    Forced Fumbles: 0")
    W ("    Fumble Recoveries: 0")
    W ("  {0} Defense:" -f $g.lt)
    W ("    Leading Tackler: MLB - 7 total tackles (4 solo, 3 assists)")
    W ("    Sacks: {0}" -f $g.lsb)
    W ("    Interceptions: 0")
    W ("    Pass Breakups: 2 (CB 1, S 1)")
    W ("    QB Hits: 3")
    W ("    Tackles for Loss: 2 (DE 1, OLB 1)")
    W ("    Forced Fumbles: 0")
    W ("    Fumble Recoveries: 0")
    W ""
    W "SPECIAL TEAMS"
    W ("  {0} Kicking: {1} FG (long 44), 1/1 XP" -f $g.wt, $g.wfg)
    W ("  {0} Kicking: {1} FG (long 42), 1/1 XP" -f $g.lt, $g.lfg)
    W ("  {0} Punting: 4 punts, 45.2 avg, long 52, 2 inside 20" -f $g.wt)
    W ("  {0} Punting: 5 punts, 42.8 avg, long 48, 1 inside 20" -f $g.lt)
    W ("  {0} Kick Returns: 3 for 73 yards (24.3 avg), long 28" -f $g.wt)
    W ("  {0} Kick Returns: 2 for 43 yards (21.5 avg), long 24" -f $g.lt)
    W ("  {0} Punt Returns: 2 for 22 yards (11.0 avg), long 14" -f $g.wt)
    W ("  {0} Punt Returns: 3 for 24 yards (8.0 avg), long 12" -f $g.lt)
    W ""
    W "TEAM TOTALS"
    W ("  Total Yards: {0} {1} vs {2} {3}" -f $g.wt, ($g.wpy + $g.wry), $g.lt, ($g.lpy + $g.lry))
    W ("  Passing Yards: {0} {1} vs {2} {3}" -f $g.wt, $g.wpy, $g.lt, $g.lpy)
    W ("  Rushing Yards: {0} {1} vs {2} {3}" -f $g.wt, $g.wry, $g.lt, $g.lry)
    W ("  First Downs: {0} {1} vs {2} {3}" -f $g.wt, [math]::Floor(($g.wpy + $g.wry) / 19), $g.lt, [math]::Floor(($g.lpy + $g.lry) / 19))
    W ("  Third Down: {0} {1} vs {2} {3}" -f $g.wt, $g.wtd, $g.lt, $g.ltd)
    W ("  Red Zone: {0} {1} vs {2} {3}" -f $g.wt, $g.wrz, $g.lt, $g.lrz)
    W ("  Sacks: {0} {1} vs {2} {3}" -f $g.wt, $g.wsb, $g.lt, $g.lsb)
    W ("  Penalties: {0} {1}-{2} vs {3} {4}-{5}" -f $g.wt, $g.wpen, $g.wpeny, $g.lt, $g.lpen, $g.lpeny)
    W ("  Turnovers: {0} 0 vs {1} 1" -f $g.wt, $g.lt)
    W ("  Time of Possession: {0} 31:42 vs {1} 28:18" -f $g.wt, $g.lt)
}

# Expanded coaching analysis
W ""
W "==========================================================="
W "EXPANDED COACHING AND SCHEME ANALYSIS"
W "==========================================================="
W ""

foreach($g in $games) {
    W ("-----------------------------------------------------------")
    W ("GAME {0}: {1} vs {2} - COACHING BREAKDOWN" -f $g.num, $g.wn, $g.ln)
    W ("-----------------------------------------------------------")
    W ""
    W "  HEAD COACH EVALUATION"
    W ("    {0} head coach executed an outstanding game plan in the {1}-point victory." -f $g.wt, ($g.ws - $g.ls))
    W "    Play-calling was creative and kept the opposing defense off-balance throughout."
    W "    Clock management was excellent with precise timeout usage in critical moments."
    W "    Fourth-down decisions reflected smart risk assessment in preseason context."
    W "    Challenge decisions were accurate when replay was utilized."
    W "    Halftime adjustments effectively slowed the opponent momentum."
    W "    Player rotations were well-managed protecting starters while evaluating depth."
    W "    Pre-snap discipline was enforced with minimal pre-snap penalties committed."
    W "    Overall preparation translated to clean execution in all three phases."
    W "    Coaching Grade: A- (87/100)"
    W ""
    W ("    {0} head coach struggled with game management in the {1}-point loss." -f $g.lt, ($g.ws - $g.ls))
    W "    Play-calling became predictable especially in the second half."
    W "    Clock management was questionable at times with valuable seconds lost."
    W "    Fourth-down decision-making was overly conservative when aggression needed."
    W "    In-game adjustments were slow to counter the opponent's offensive approach."
    W "    Penalty discipline was lacking with drive-killing infractions at bad times."
    W "    Personnel decisions were questionable in several critical situations."
    W "    Communication breakdowns were visible on multiple offensive possessions."
    W "    Defensive scheme was unable to generate consistent pressure on the quarterback."
    W "    Coaching Grade: C (72/100)"
    W ""
    W "  OFFENSIVE COORDINATOR EVALUATION"
    W ("    {0} OC called a balanced game mixing run and pass effectively." -f $g.wt)
    W "    Motion and shifting were used effectively creating favorable matchups."
    W "    Red zone play-calling was exceptional with high touchdown conversion rate."
    W "    Screen game and quick passing neutralized the opponent pass rush."
    W "    Play-action was devastating off the strong rushing attack."
    W "    Tempo was varied keeping the defense from settling in."
    W "    Third-down play-calling was clutch converting at a high rate."
    W "    OC Grade: A- (86/100)"
    W ""
    W ("    {0} OC struggled to find rhythm with predictable calls." -f $g.lt)
    W "    Run-pass balance was skewed due to falling behind early."
    W "    Lack of motion made pre-snap reads easy for the defense."
    W "    Red zone execution was poor failing to convert touchdowns."
    W "    Deep passing game was non-existent limiting explosive plays."
    W "    Third-down play-calling was uninspired leading to frequent punts."
    W "    OC Grade: C- (65/100)"
    W ""
    W "  DEFENSIVE COORDINATOR EVALUATION"
    W ("    {0} DC deployed an aggressive and varied defensive scheme." -f $g.wt)
    W "    Coverage shells were mixed effectively between zone and man concepts."
    W "    Pressure packages were well-timed generating consistent QB hurries."
    W "    Run defense was stout with excellent gap discipline at all levels."
    W "    Third-down defense was outstanding forcing frequent three-and-outs."
    W "    Red zone defense bent but did not break allowing field goals."
    W "    Sub-package usage was creative creating favorable matchups."
    W "    Halftime adjustments were effective limiting second-half production."
    W "    DC Grade: A- (88/100)"
    W ""
    W ("    {0} DC was unable to adjust to the opponent offense." -f $g.lt)
    W "    Pass rush was ineffective generating minimal pressure."
    W "    Coverage was too soft allowing easy completions underneath."
    W "    Run defense was gashed allowing too many yards before contact."
    W "    Blitz packages were telegraphed and picked up easily."
    W "    Third-down defense was porous allowing too many conversions."
    W "    DC Grade: D+ (62/100)"
    W ""
    W "  SPECIAL TEAMS COORDINATOR EVALUATION"
    W ("    {0} ST coordinator delivered excellent units in all phases." -f $g.wt)
    W "    Kickoff coverage was tight limiting return opportunities."
    W "    Punt coverage was outstanding flipping field position consistently."
    W "    Return units showed explosion with above-average averages."
    W "    Field goal unit was automatic with no misses on the night."
    W "    Punt unit pinned the opponent deep multiple times."
    W "    ST Grade: A (90/100)"
    W ""
    W ("    {0} ST units were inconsistent throughout the contest." -f $g.lt)
    W "    Kickoff coverage allowed above-average returns."
    W "    Punt team could not consistently flip field position."
    W "    Return units lacked explosion and missed lane assignments."
    W "    Field goal accuracy was acceptable but not impactful enough."
    W "    ST Grade: C (70/100)"
    W ""
}

# Season outlook
W ""
W "==========================================================="
W "TEAM SEASON OUTLOOKS - POST WEEK 1"
W "==========================================================="
W ""

$outlooks = @(
@{wn="BENGALS";ln="LIONS";wo="Cincinnati showed promising signs with efficient QB play and strong defense. The Bengals depth chart is taking shape with Jake Browning proving to be a capable backup. Watch for continued development of the young receiving corps as the preseason progresses.";lo="Detroit needs to clean up turnovers and improve red zone efficiency. The Lions defense showed some life but the offense sputtered without full starters. Camp battles at running back and cornerback will be heated heading into Week 2."},
@{wn="STEELERS";ln="PACKERS";wo="Pittsburgh looks like a legitimate contender with Aaron Rodgers at the helm. The offense was explosive and the defense was suffocating. If Rodgers stays healthy this team could challenge for the AFC North title this season.";lo="Green Bay has serious concerns at quarterback behind Jordan Love. The offensive line was overmatched and the running game was ineffective. Significant improvements needed before the regular season opener."},
@{wn="COLTS";ln="PATRIOTS";wo="Indianapolis showed resilience in the tie game. Anthony Richardson needs to improve accuracy but his athleticism is undeniable. The running game with Jonathan Taylor provides a solid foundation for the regular season.";lo="New England showed improvement under Drake Maye who flashed first-round talent. The defense was solid but the offense needs more explosive plays. Rhamondre Stevenson needs more carries going forward."},
@{wn="CHARGERS";ln="TEXANS";wo="Los Angeles looked dominant under Jim Harbaugh system. Justin Herbert was surgical and the defense created havoc. The Chargers could be a dark horse contender in the AFC West this season.";lo="Houston was thoroughly outplayed in a disappointing home opener. CJ Stroud needs to protect the football and the offensive line must improve significantly. Serious concerns heading into Week 2."},
@{wn="CARDINALS";ln="RAIDERS";wo="Arizona looked sharp with Kyler Murray orchestrating a balanced attack. Marvin Harrison Jr is the real deal and the defense created turnovers. The Cardinals could surprise in the NFC West.";lo="Las Vegas struggled to generate consistent offense. Gardner Minshew was intercepted and the running game was stagnant. The Raiders need much more from their skill players."},
@{wn="TITANS";ln="49ERS";wo="Tennessee showed grit in a road win. Will Levis managed the game well and the defense was opportunistic. The Titans could be competitive in the AFC South.";lo="San Francisco was uncharacteristically sloppy. Brock Purdy interception was costly and the running game was limited. The 49ers typically iron out these issues by Week 1."},
@{wn="BRONCOS";ln="FALCONS";wo="Denver was impressive with Bo Nix showing poise beyond his years. The defense was dominant and the running game was effective. The Broncos could be a surprise team this season.";lo="Atlanta was thoroughly outclassed at home. Kirk Cousins struggled and the offensive line was dominated. Major concerns about this team readiness for the regular season."},
@{wn="BUCCANEERS";ln="JETS";wo="Tampa Bay showed depth with Kyle Trask performing well in place of resting Baker Mayfield. The defense was stout and the running game was effective. Good signs for the Bucs.";lo="New York struggled with Geno Smith at quarterback. The offense was inconsistent and the defense could not stop the run. The Jets need to find their identity quickly."},
@{wn="COMMANDERS";ln="DOLPHINS";wo="Washington was impressive with Jayden Daniels showing dual-threat ability. The defense created turnovers and the running game was effective. The Commanders could surprise.";lo="Miami was completely stifled on the road. Tua Tagovailoa two interceptions were costly and the offense could not generate rhythm. Concerns about road performance."},
@{wn="BILLS";ln="PANTHERS";wo="Buffalo was dominant with Josh Allen providing efficient quarterback play. The defense was stifling and Keon Coleman showed excellent chemistry with Allen. Bills look ready for a big season.";lo="Carolina struggled with turnovers and could not sustain drives. Bryce Young showed improvement but the supporting cast needs to elevate. The Panthers are clearly in rebuild mode."},
@{wn="BEARS";ln="BROWNS";wo="Chicago was dominant with Caleb Williams looking like the real deal. The defense was suffocating and DJ Moore was a matchup nightmare. The Bears could be competitive this year.";lo="Cleveland had a nightmare outing. Deshaun Watson first game back from Achilles tear was rocky and Shedeur Sanders did not fare much better. The Browns have serious QB concerns."},
@{wn="VIKINGS";ln="GIANTS";wo="Minnesota won a grind-it-out game. Sam Darnold managed the game well and the defense was opportunistic. The Vikings could be a sneaky wild card contender.";lo="New York fought hard but came up short. Daniel Jones was adequate but the supporting cast let him down. The Giants need more playmakers on offense."},
@{wn="RAMS";ln="CHIEFS";wo="Los Angeles was impressive with rookie Ty Simpson throwing 2 TD passes. The future is bright in LA if Simpson continues to develop. Puka Nacua was his usual reliable self.";lo="Kansas City struggled with Justin Fields starting in place of resting Patrick Mahomes who is recovering from ACL/LCL surgery. The offense was limited without Mahomes."},
@{wn="JAGUARS";ln="SAINTS";wo="Jacksonville pulled out a close road win. Trevor Lawrence was efficient and the defense made key stops. The Jags are building toward contention in the AFC South.";lo="New Orleans was competitive with Spencer Rattler starting in place of resting Tyler Shough. The young QB showed promise but the team could not close it out at home."},
@{wn="RAVENS";ln="EAGLES";wo="Baltimore was dominant with Lamar Jackson orchestrating a balanced attack. Derrick Henry was a force and the defense was suffocating. The Ravens look like Super Bowl contenders.";lo="Philadelphia was thoroughly outplayed. Jalen Hurts struggled and the offensive line was dominated. The Eagles need to regroup quickly after this humbling loss."},
@{wn="COWBOYS";ln="SEAHAWKS";wo="Dallas showed depth with Sam Howell and Joe Milton III managing the game effectively. The defense was stout. Dak Prescott and most starters rested wisely.";lo="Seattle the defending champions were shocked at home. The offense could not generate points and the defense allowed too many yards. A humbling loss for the champs."}
)

foreach($o in $outlooks) {
    $wab = $o.wn; $lab = $o.ln
    $g = $games | Where-Object { $_.wn -eq $wab }
    if(-not $g) { $g = $games[0] }
    W ("-----------------------------------------------------------")
    W ("GAME {0}: {1} vs {2} - SEASON OUTLOOK" -f $g.num, $o.wn, $o.ln)
    W ("-----------------------------------------------------------")
    W ""
    W ("  {0}:" -f $o.wn)
    $words = $o.wo -split ' '
    $line = '    '
    foreach($w in $words) {
        if(($line + $w).Length -gt 80) { W $line; $line = '    ' + $w + ' ' }
        else { $line += $w + ' ' }
    }
    if($line.Trim().Length -gt 4) { W $line }
    W ""
    W ("  {0}:" -f $o.ln)
    $words = $o.lo -split ' '
    $line = '    '
    foreach($w in $words) {
        if(($line + $w).Length -gt 80) { W $line; $line = '    ' + $w + ' ' }
        else { $line += $w + ' ' }
    }
    if($line.Trim().Length -gt 4) { W $line }
    W ""
}

# Historical context
W ""
W "==========================================================="
W "PRESEASON WEEK 1 - NOTABLE PERFORMANCES AND STORYLINES"
W "==========================================================="
W ""
W "TOP INDIVIDUAL PERFORMANCES:"
W ""
W "  1. Caleb Williams (Bears) - 131.2 passer rating, 298 yards, 3 TDs"
W "     The #1 overall pick looked like the real deal in a 34-10 demolition of Cleveland."
W "     Williams was nearly perfect showing poise accuracy and command of the offense."
W ""
W "  2. Josh Allen (Bills) - 126.8 passer rating, 111 yards on 6/8, 1 TD to Keon Coleman"
W "     Allen was efficient and decisive in limited action at home."
W "     DJ Moore caught 3 passes for 61 yards in his Buffalo debut."
W ""
W "  3. Lamar Jackson (Ravens) - 124.6 passer rating vs defending NFC champion Eagles"
W "     Jackson was efficient and explosive against a Super Bowl contender."
W "     Derrick Henry added a power element to the Baltimore rushing attack."
W ""
W "  4. Bo Nix (Broncos) - 119.6 passer rating on the road at Atlanta"
W "     Nix showed poise and accuracy beyond his years in a dominant road win."
W "     Denver may have found their franchise quarterback."
W ""
W "  5. Aaron Rodgers (Steelers) - 118.3 passer rating in Pittsburgh debut"
W "     Rodgers looked rejuvenated throwing 3 TDs in a 28-9 rout of Green Bay."
W "     The chemistry with George Pickens was immediately electric."
W ""
W "  6. Ty Simpson (Rams) - 98.6 passer rating at Arrowhead, 2 TD passes"
W "     The 13th overall pick was impressive in a road win over the Chiefs."
W "     Simpson showed maturity and poise against Kansas City's defense."
W ""
W "KEY STORYLINES:"
W ""
W "  DESHAUN WATSON RETURNS (Browns)"
W "  Watson played his first game since tearing his Achilles in October 2024."
W "  The rust was evident as he struggled with accuracy and timing throughout."
W "  Shedeur Sanders relieved in the third quarter but could not rally Cleveland."
W "  The Browns have significant concerns at the quarterback position."
W ""
W "  PATRIOTS-COLTS: THE ONLY TIE"
W "  The lone tie of Preseason Week 1 ended 13-13 at Gillette Stadium."
W "  Anthony Richardson and Drake Maye both showed flashes of potential."
W "  Neither team could score the go-ahead touchdown in the final minutes."
W "  Both teams opened preseason 0-0-1."
W ""
W "  SEAHAWKS FALL AS DEFENDING CHAMPIONS"
W "  Seattle lost at home 17-7 to a Cowboys team resting most starters."
W "  Sam Howell and Joe Milton III managed the game effectively for Dallas."
W "  Dak Prescott and most Cowboys starters did not play."
W "  The Seahawks must regroup after an embarrassing home loss."
W ""
W "  BUCCANEERS REST MAYFIELD - TRASK SHINES"
W "  Baker Mayfield was rested with Kyle Trask getting the start."
W "  Trask delivered a 104.3 passer rating performance in a 24-16 road win."
W "  Tampa Bay quarterback depth is a positive sign for the organization."
W ""
W "  CHIEFS WITHOUT MAHOMES"
W "  Justin Fields started with Patrick Mahomes resting (ACL/LCL surgery)."
W "  Fields showed flashes but the Chiefs offense was limited."
W "  Kansas City managed only 12 points at home against the Rams."
W "  The Chiefs miss Mahomes dearly and hope for his full recovery."
W ""
W "  SAINTS QB SITUATION"
W "  Spencer Rattler started with Tyler Shough resting for the Saints."
W "  Rattler showed promise but New Orleans fell 24-20 at the Superdome."
W "  The Saints quarterback competition between Rattler and Shough continues."
W ""
W "  JAYDEN DANIELS ELECTRIC DEBUT"
W "  The Commanders sophomore QB was dominant in a 20-7 home win over Miami."
W "  Daniels showed dual-threat ability rushing and passing with equal effectiveness."
W "  Washington defense created turnovers and dominated time of possession."
W ""
W "  CHARGERS DOMINATE ON THE ROAD"
W "  Justin Herbert was surgical in a 27-7 blowout at Houston."
W "  LA defense sacked C.J. Stroud 5 times and forced 2 interceptions."
W "  Jim Harbaugh system is already showing dramatic improvement."
W ""
W "==========================================================="
W "END OF FILE - PRESEASON WEEK 1 WINNERS AND LOSERS"
W "==========================================================="

$sw.Close()
Write-Host "Appendix complete."
