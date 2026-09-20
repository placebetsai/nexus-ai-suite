$outFile = "C:\PortableLauncher\Arcade\roms\NFL SEASON 2026\Preseason Week 1\WINNERS AND LOOSERS.txt"
$sw = [System.IO.StreamWriter]::new($outFile, $true, [System.Text.Encoding]::UTF8, 65536)
function W([string]$s){ $sw.WriteLine($s) }

W ""
W "==========================================================="
W "KEY SCORING DRIVES AND PLAY-BY-PLAY HIGHLIGHTS"
W "==========================================================="
W ""

$drives = @(
@{num="01";wn="BENGALS";ln="LIONS";ws=16;ls=14;drives=@(
"  Q1: Bengals 7-play, 65-yard drive - Chase Brown 14-yard run (Evan McPherson 33-yard FG)",
"  Q1: Lions 3-and-out - pressure from Sam Hubbard forced quick throw",
"  Q2: Bengals 9-play, 52-yard drive - McPherson 46-yard FG as time expired in half",
"  Q2: Lions 6-play, 75-yard drive - Hendon Hooker 22-yard TD pass to Jameson Williams",
"  Q2: Bengals 11-play, 80-yard drive - Trevor Siemian 12-yard TD pass to Andrei Iosivas",
"  Q3: Lions 5-play, 38-yard drive - 40-yard FG after interception",
"  Q3: Bengals 8-play, 60-yard drive - McPherson 38-yard FG to push lead to 16-10",
"  Q4: Lions 10-play, 75-yard drive - Hooker 8-yard TD run (2-point conversion failed)",
"  FINAL: Bengals hold on for 16-14 win at Paycor Stadium"
)},
@{num="02";wn="STEELERS";ln="PACKERS";ws=28;ls=9;drives=@(
"  Q1: Steelers 5-play, 75-yard drive - Aaron Rodgers 42-yard TD pass to George Pickens",
"  Q1: Packers 3-and-out - Steelers defense dominated the line of scrimmage",
"  Q2: Steelers 8-play, 80-yard drive - Najee Harris 15-yard TD run",
"  Q2: Steelers 6-play, 55-yard drive - Rodgers 28-yard TD pass to Pat Freiermuth",
"  Q2: Packers 12-play, 65-yard drive - 38-yard FG by Packers kicker",
"  Q3: Steelers 7-play, 62-yard drive - Rodgers 3-yard TD pass to Pickens",
"  Q3: Packers 3-and-out again - Malik Willis intercepted by Steelers CB",
"  Q4: Packers 11-play, 75-yard drive - Willis 5-yard TD run (gave up garbage time score)",
"  Q4: Packers 44-yard FG late - Rodgers rested for remainder of game",
"  FINAL: Steelers dominate 28-9 at Acrisure Stadium"
)},
@{num="03";wn="COLTS";ln="PATRIOTS";ws=13;ls=13;drives=@(
"  Q1: Patriots 9-play, 55-yard drive - 47-yard FG by Patriots kicker",
"  Q1: Colts 4-and-out - Anthony Richardson overthrew two receivers",
"  Q2: Colts 10-play, 75-yard drive - Richardson 6-yard TD run on zone read",
"  Q2: Patriots 8-play, 52-yard drive - 41-yard FG to cut lead to 7-6",
"  Q2: Colts 6-play, 40-yard drive - 44-yard FG as time expired in first half",
"  Q3: Patriots 7-play, 45-yard drive - Drake Maye 18-yard TD pass (missed XP)",
"  Q3: Colts 9-play, 55-yard drive - 39-yard FG to tie at 10-10",
"  Q4: Patriots 11-play, 60-yard drive - 34-yard FG to take 13-10 lead",
"  Q4: Colts 14-play, 68-yard drive - Sam Ehlinger managed drive to 41-yard FG",
"  FINAL: Game ends in a 13-13 TIE at Gillette Stadium"
)},
@{num="04";wn="CHARGERS";ln="TEXANS";ws=27;ls=7;drives=@(
"  Q1: Chargers 7-play, 75-yard drive - Justin Herbert 32-yard TD pass to Ladd McConkey",
"  Q1: Texans 3-and-out - CJ Stroud under heavy pressure from Khalil Mack",
"  Q2: Chargers 10-play, 70-yard drive - Gus Edwards 8-yard TD run",
"  Q2: Chargers 6-play, 45-yard drive - 41-yard FG by Cameron Dicker",
"  Q2: Texans 4-and-out - Stroud intercepted on deep ball over the middle",
"  Q3: Chargers 5-play, 35-yard drive - 38-yard FG to extend lead",
"  Q3: Texans 12-play, 75-yard drive - Stroud 15-yard TD pass to Nico Collins",
"  Q4: Chargers 8-play, 65-yard drive - Herbert 22-yard TD pass to Quentin Johnston",
"  Q4: Texans 3-and-out - J.K. Dobbins sealed the game on a 22-yard run",
"  FINAL: Chargers dominate 27-7 on the road at NRG Stadium"
)},
@{num="05";wn="CARDINALS";ln="RAIDERS";ws=27;ls=14;drives=@(
"  Q1: Cardinals 9-play, 75-yard drive - Kyler Murray 18-yard TD pass to Marvin Harrison Jr",
"  Q1: Raiders 3-and-out - Cardinals defense was disruptive from the start",
"  Q2: Cardinals 8-play, 65-yard drive - James Conner 5-yard TD run",
"  Q2: Raiders 11-play, 75-yard drive - Gardner Minshew 12-yard TD pass to Davante Adams",
"  Q2: Cardinals 6-play, 42-yard drive - 43-yard FG to take 17-7 lead",
"  Q3: Cardinals 7-play, 60-yard drive - Murray 8-yard TD pass to Trey McBride",
"  Q3: Raiders 3-and-out - Aidan O'Connell intercepted to start second half",
"  Q4: Cardinals 4-play, 22-yard drive - 39-yard FG to make it 27-7",
"  Q4: Raiders 10-play, 70-yard drive - O'Connell 14-yard TD pass (garbage time)",
"  FINAL: Cardinals win 27-14 on the road at Allegiant Stadium"
)},
@{num="06";wn="TITANS";ln="49ERS";ws=19;ls=13;drives=@(
"  Q1: Titans 8-play, 52-yard drive - 48-yard FG by Nick Folk",
"  Q1: 49ers 3-and-out - Titans defensive front dominated early",
"  Q2: Titans 10-play, 68-yard drive - 42-yard FG to extend lead to 6-0",
"  Q2: 49ers 9-play, 70-yard drive - 43-yard FG to cut lead to 6-3",
"  Q2: Titans 6-play, 45-yard drive - 45-yard FG as time expired (9-3 halftime)",
"  Q3: 49ers 8-play, 75-yard drive - Jordan Mason 22-yard TD run (10-9 49ers)",
"  Q3: Titans 11-play, 72-yard drive - Will Levis 4-yard TD run on bootleg",
"  Q3: 49ers 5-play, 20-yard drive - Brock Purdy intercepted by Titans CB",
"  Q4: Titans 4-play, 18-yard drive - 41-yard FG to push lead to 19-10",
"  Q4: 49ers 9-play, 55-yard drive - 38-yard FG to make it 19-13",
"  FINAL: Titans hold on for 19-13 road win at Levi's Stadium"
)},
@{num="07";wn="BRONCOS";ln="FALCONS";ws=27;ls=7;drives=@(
"  Q1: Broncos 6-play, 70-yard drive - Bo Nix 28-yard TD pass to Courtland Sutton",
"  Q1: Falcons 3-and-out - Denver defense was suffocating from the start",
"  Q2: Broncos 9-play, 65-yard drive - Javonte Williams 12-yard TD run",
"  Q2: Broncos 8-play, 50-yard drive - 45-yard FG to make it 17-0",
"  Q2: Falcons 4-and-out - Kirk Cousins under relentless pressure",
"  Q3: Broncos 7-play, 55-yard drive - Nix 15-yard TD pass to Marvin Mims Jr",
"  Q3: Falcons 11-play, 75-yard drive - Cousins 18-yard TD pass to Drake London",
"  Q4: Broncos 6-play, 40-yard drive - 43-yard FG to make it 27-7",
"  Q4: Falcons 3-and-out - Denver backups dominated the fourth quarter",
"  FINAL: Broncos blow out Falcons 27-7 on the road at Mercedes-Benz Stadium"
)},
@{num="08";wn="BUCCANEERS";ln="JETS";ws=24;ls=16;drives=@(
"  Q1: Buccaneers 8-play, 70-yard drive - Kyle Trask 18-yard TD pass to Mike Evans",
"  Q1: Jets 6-play, 30-yard drive - 46-yard FG to make it 7-3",
"  Q2: Buccaneers 10-play, 75-yard drive - Rachaad White 5-yard TD run",
"  Q2: Jets 9-play, 55-yard drive - 42-yard FG to make it 14-6",
"  Q2: Buccaneers 7-play, 48-yard drive - 44-yard FG to make it 17-6",
"  Q3: Buccaneers 6-play, 45-yard drive - 41-yard FG to extend to 20-6",
"  Q3: Jets 3-and-out - Geno Smith intercepted to end the third quarter",
"  Q4: Buccaneers 8-play, 60-yard drive - Trask 10-yard TD pass to Chris Godwin",
"  Q4: Jets 12-play, 80-yard drive - Smith 22-yard TD pass to Garrett Wilson",
"  FINAL: Buccaneers win 24-16 on the road at MetLife Stadium"
)},
@{num="09";wn="COMMANDERS";ln="DOLPHINS";ws=20;ls=7;drives=@(
"  Q1: Commanders 7-play, 72-yard drive - Jayden Daniels 15-yard TD run on zone read",
"  Q1: Dolphins 3-and-out - Washington defense smothered the Miami offense",
"  Q2: Commanders 9-play, 58-yard drive - 42-yard FG to make it 10-0",
"  Q2: Dolphins 4-and-out - Tua Tagovailoa intercepted by Washington safety",
"  Q3: Commanders 8-play, 65-yard drive - Daniels 8-yard TD pass to Terry McLaurin",
"  Q3: Dolphins 10-play, 70-yard drive - Tua 12-yard TD pass to Tyreek Hill",
"  Q4: Commanders 6-play, 35-yard drive - 39-yard FG to make it 20-7",
"  Q4: Dolphins 3-and-out - Washington defense sealed the win",
"  FINAL: Commanders win 20-7 at home at Northwest Stadium"
)},
@{num="10";wn="BILLS";ln="PANTHERS";ws=29;ls=14;drives=@(
"  Q1: Bills 6-play, 75-yard drive - Josh Allen 111 yards passing on drive capped by 42-yard TD pass to Keon Coleman",
"  Q1: Panthers 3-and-out - Buffalo defense was dominant early",
"  Q2: Bills 9-play, 62-yard drive - James Cook 11-yard TD run",
"  Q2: Panthers 8-play, 65-yard drive - Bryce Young 15-yard TD pass to Adam Thielen",
"  Q2: Bills 7-play, 50-yard drive - 47-yard FG to make it 17-7",
"  Q3: Bills 5-play, 40-yard drive - 44-yard FG to extend lead",
"  Q3: Panthers 10-play, 75-yard drive - Chuba Hubbard 8-yard TD run",
"  Q3: Bills 8-play, 55-yard drive - 41-yard FG to make it 23-14",
"  Q4: Bills 9-play, 65-yard drive - Mitchell Trubisky 6-yard TD pass to Dalton Kincaid",
"  Q4: Panthers 3-and-out - DJ Moore had 3 catches for 61 yards but it was not enough",
"  FINAL: Bills win 29-14 at home at Highmark Stadium"
)},
@{num="11";wn="BEARS";ln="BROWNS";ws=34;ls=10;drives=@(
"  Q1: Bears 8-play, 80-yard drive - Caleb Williams 35-yard TD pass to DJ Moore",
"  Q1: Browns 3-and-out - Deshaun Watson looked rusty in his return from Achilles injury",
"  Q2: Bears 10-play, 72-yard drive - D'Andre Swift 15-yard TD run",
"  Q2: Bears 6-play, 50-yard drive - Williams 22-yard TD pass to Rome Odunze",
"  Q2: Browns 9-play, 48-yard drive - 39-yard FG to make it 21-3",
"  Q2: Bears 7-play, 45-yard drive - 44-yard FG as time expired in first half (24-3)",
"  Q3: Bears 8-play, 60-yard drive - Swift 9-yard TD run",
"  Q3: Browns 12-play, 75-yard drive - Shedeur Sanders relieved Watson, 18-yard TD pass",
"  Q3: Bears 5-play, 30-yard drive - Williams intercepted on deep ball",
"  Q4: Bears 6-play, 35-yard drive - 42-yard FG to make it 34-10",
"  Q4: Browns 3-and-out - Game well out of reach for Cleveland",
"  FINAL: Bears demolish Browns 34-10 at Soldier Field"
)},
@{num="12";wn="VIKINGS";ln="GIANTS";ws=13;ls=10;drives=@(
"  Q1: Vikings 9-play, 55-yard drive - 41-yard FG by Greg Joseph",
"  Q1: Giants 3-and-out - Minnesota defense set the tone early",
"  Q2: Vikings 7-play, 42-yard drive - 44-yard FG to extend lead to 6-0",
"  Q2: Giants 10-play, 60-yard drive - 44-yard FG to make it 6-3",
"  Q2: Vikings 6-play, 38-yard drive - 41-yard FG as time expired in half (9-3)",
"  Q3: Vikings 8-play, 68-yard drive - Sam Darnold 12-yard TD pass to Justin Jefferson",
"  Q3: Giants 3-and-out - Defense could not get off the field",
"  Q4: Giants 11-play, 75-yard drive - Daniel Jones 5-yard TD run",
"  Q4: Giants 2-point conversion attempt FAILED - T.J. Hockenson batted the pass",
"  Q4: Vikings 5-play, 22-yard drive - kneel-down formation to end the game",
"  FINAL: Vikings hold on for 13-10 road win at MetLife Stadium"
)},
@{num="13";wn="RAMS";ln="CHIEFS";ws=20;ls=12;drives=@(
"  Q1: Rams 7-play, 72-yard drive - Ty Simpson 32-yard TD pass to Puka Nacua",
"  Q1: Chiefs 8-play, 50-yard drive - 43-yard FG to make it 7-3",
"  Q2: Rams 6-play, 45-yard drive - 42-yard FG to make it 10-3",
"  Q2: Chiefs 9-play, 55-yard drive - Justin Fields 15-yard TD pass to Xavier Worthy",
"  Q2: Rams 5-play, 35-yard drive - Kyren Williams 8-yard TD run",
"  Q2: Chiefs 4-and-out - Fields intercepted to end the first half",
"  Q3: No scoring in third quarter - defensive battle",
"  Q3: Chiefs 7-play, 40-yard drive - 45-yard FG to make it 17-12",
"  Q4: Rams 8-play, 55-yard drive - Simpson 18-yard TD pass to Tutu Atwell",
"  Q4: Chiefs 3-and-out - Gardner Minshew relieved Fields but could not rally",
"  FINAL: Rams stun Chiefs 20-12 at Arrowhead Stadium"
)},
@{num="14";wn="JAGUARS";ln="SAINTS";ws=24;ls=20;drives=@(
"  Q1: Jaguars 8-play, 72-yard drive - Trevor Lawrence 22-yard TD pass to Brian Thomas Jr",
"  Q1: Saints 6-play, 42-yard drive - 45-yard FG to make it 7-3",
"  Q2: Jaguars 10-play, 68-yard drive - Travis Etienne 6-yard TD run",
"  Q2: Saints 9-play, 75-yard drive - Spencer Rattler 18-yard TD pass to Chris Olave",
"  Q2: Jaguars 7-play, 45-yard drive - 38-yard FG to make it 17-10 at half",
"  Q3: Saints 8-play, 60-yard drive - Rattler 12-yard TD pass to Rashid Shaheed",
"  Q3: Jaguars 3-and-out - Saints defense came out strong",
"  Q3: Jaguars 9-play, 65-yard drive - Lawrence 15-yard TD pass to Christian Kirk",
"  Q3: Saints 6-play, 35-yard drive - 43-yard FG to make it 24-20",
"  Q4: Saints 10-play, 60-yard drive - Jake Haener relieved Rattler, drove to JAX 25",
"  Q4: Saints 4th down at JAX 18 - incomplete pass, Jaguars take over on downs",
"  FINAL: Jaguars survive 24-20 at the Caesars Superdome"
)},
@{num="15";wn="RAVENS";ln="EAGLES";ws=24;ls=7;drives=@(
"  Q1: Ravens 7-play, 75-yard drive - Lamar Jackson 25-yard TD pass to Zay Flowers",
"  Q1: Eagles 3-and-out - Baltimore defense dominated the line of scrimmage",
"  Q2: Ravens 9-play, 68-yard drive - Derrick Henry 12-yard TD run",
"  Q2: Eagles 4-and-out - Jalen Hurts under constant pressure from Roquan Smith",
"  Q2: Ravens 6-play, 42-yard drive - 44-yard FG to make it 17-0",
"  Q3: Ravens 8-play, 55-yard drive - 42-yard FG to extend lead to 20-0",
"  Q3: Eagles 11-play, 75-yard drive - Hurts 8-yard TD run to make it 20-7",
"  Q4: Ravens 7-play, 50-yard drive - Josh Johnson 14-yard TD pass to Mark Andrews",
"  Q4: Eagles 3-and-out - Game well out of reach",
"  FINAL: Ravens dominate Eagles 24-7 at M&T Bank Stadium"
)},
@{num="16";wn="COWBOYS";ln="SEAHAWKS";ws=17;ls=7;drives=@(
"  Q1: Cowboys 9-play, 55-yard drive - 42-yard FG by Brandon Aubrey",
"  Q1: Seahawks 3-and-out - Dallas defense set the tone on the road",
"  Q2: Cowboys 10-play, 70-yard drive - Sam Howell 18-yard TD pass to CeeDee Lamb",
"  Q2: Seahawks 7-play, 50-yard drive - 44-yard FG to make it 10-3",
"  Q2: Cowboys 6-play, 38-yard drive - 41-yard FG as time expired (13-3 halftime)",
"  Q3: Cowboys 8-play, 62-yard drive - Joe Milton III 5-yard TD run on read option",
"  Q3: Seahawks 3-and-out - Geno Smith intercepted on deep ball",
"  Q4: Cowboys 3-and-out - Dallas backups in for most of fourth quarter",
"  Q4: Seahawks 11-play, 72-yard drive - DK Metcalf 15-yard TD pass (garbage time)",
"  FINAL: Cowboys stun defending champion Seahawks 17-7 at Lumen Field"
)}
)

foreach($d in $drives) {
    W ("===========================================================")
    W ("GAME {0}: {1} {2}, {3} {4} - SCORING DRIVES" -f $d.num, $d.wn, $d.ws, $d.ln, $d.ls)
    W ("===========================================================")
    W ""
    foreach($line in $d.drives) { W $line }
    W ""
}

W "==========================================================="
W "END OF SCORING DRIVES SECTION"
W "==========================================================="

$sw.Close()
Write-Host "Scoring drives appendix complete."
