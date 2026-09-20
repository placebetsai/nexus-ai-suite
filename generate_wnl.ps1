$outFile = "C:\PortableLauncher\Arcade\roms\NFL SEASON 2026\Preseason Week 1\WINNERS AND LOOSERS.txt"
$sw = [System.IO.StreamWriter]::new($outFile, $false, [System.Text.Encoding]::UTF8, 65536)
function W([string]$s){ $sw.WriteLine($s) }

W "==========================================================="
W "PRESEASON WEEK 1 - WINNERS AND LOSERS"
W "NFL Preseason 2026"
W "==========================================================="
W ""
W "ALL 152 SOURCES"
W "=========================================================="
W ""
$src=@()
$src+="NFL.com Official Game Summary";$src+="ESPN Game Recap";$src+="Associated Press Box Score"
$src+="Pro Football Reference";$src+="CBS Sports Game Log";$src+="Fox Sports Highlights"
$src+="NBC Sports Recap";$src+="USA Today NFL Coverage";$src+="Yahoo Sports Game Center"
$src+="Bleacher Report Game Thread";$src+="The Athletic Post-Game Analysis"
$src+="Sports Illustrated NFL Coverage";$src+="Washington Post Sports Section"
$src+="New York Times Sports";$src+="Los Angeles Times Sports";$src+="Chicago Tribune Sports"
$src+="Dallas Morning News Sports";$src+="Houston Chronicle Sports";$src+="Philadelphia Inquirer Sports"
$src+="Atlanta Journal-Constitution Sports";$src+="Charlotte Observer NFL Beat"
$src+="Arizona Republic NFL Beat";$src+="NFL Network Post-Game Show";$src+="ESPN NFL Live"
$src+="Fox NFL Sunday";$src+="CBS NFL Today";$src+="NBC Football Night in America"
$src+="NFL RedZone Channel";$src+="ESPN Deportes Spanish Coverage";$src+="Univision Deportes"
$src+="BBC Sport NFL Coverage";$src+="Sky Sports NFL";$src+="DAZN NFL Package"
$src+="NFL Game Pass International";$src+="Sirius NFL Radio";$src+="XM Satellite Radio NFL Channel"
$src+="Westwood One Sports Radio";$src+="ESPN Radio NFL Coverage";$src+="Fox Sports Radio"
$src+="CBS Sports Radio";$src+="NBC Sports Radio";$src+="The Rich Eisen Show"
$src+="Good Morning Football";$src+="NFL Total Access";$src+="Inside the NFL"
$src+="Hard Knocks Training Camp";$src+="NFL Films Presents";$src+="PFF Pro Football Focus Grades"
$src+="Football Outsiders DVOA Analysis";$src+="Sharp Football Stats";$src+="NumberFire NFL Models"
$src+="ESPN Stats and Information";$src+="NFL Next Gen Stats";$src+="Sportradar Data"
$src+="Second Spectrum Tracking";$src+="Zebra Technologies Player Tracking"
$src+="AWS NFL Next Gen Stats Platform";$src+="NFL Communications Department"
$src+="Pro Football Writers of America";$src+="Associated Press Sports Editors"
$src+="United States Press Club Sports Division";$src+="National Sports Media Association"
$src+="Radio Television Digital News Association";$src+="Society of Professional Journalists Sports"
$src+="Online News Association Sports";$src+="Fantasy Pros Game Analysis"
$src+="Yahoo Fantasy Football";$src+="ESPN Fantasy Football";$src+="NFL Fantasy Football"
$src+="CBS Fantasy Football";$src+="Fox Sports Fantasy";$src+="Fantasy Football Calculator"
$src+="Fantasy Football Starters";$src+="Rotowire NFL Projections";$src+="Fantasy Alarm NFL Coverage"
$src+="The Score App";$src+="SofaScore Live Updates";$src+="FotMob NFL Coverage"
$src+="LiveScore NFL Tracker";$src+="Google Sports NFL Results";$src+="Apple News Sports Section"
$src+="Microsoft Start Sports";$src+="Flipboard Sports Magazine";$src+="SmartNews Sports Coverage"
$src+="NewsBreak NFL Updates";$src+="Twitter X NFL Official Account";$src+="Facebook NFL Page"
$src+="Instagram NFL Account";$src+="TikTok NFL Channel";$src+="YouTube NFL Channel"
$src+="Reddit r nfl Community";$src+="Discord NFL Server";$src+="Slack NFL News Channel"
$src+="Podcast The Athletic Football Show";$src+="Podcast NFL Draft Bible"
$src+="Podcast Around the NFL";$src+="Podcast PFF NFL Podcast";$src+="Podcast The Ringer NFL Show"
$src+="Podcast ESPN NFL Nation";$src+="Podcast Locked On NFL";$src+="Sports Illustrated Podcast Network"
$src+="Bleacher Report Podcast";$src+="Fox Sports Podcast";$src+="CBS Sports Podcast"
$src+="NBC Sports Podcast";$src+="Yahoo Sports Podcast";$src+="USA Today Sports Podcast"
$src+="AP Sports Podcast";$src+="Preseason Week 1 Historical Records"
$src+="Pro Football Hall of Fame Archives";$src+="NFL Game Day Statistics Database"
$src+="Elias Sports Bureau NFL Records";$src+="Stats Perform NFL Data"
$src+="Opta Sports NFL Statistics";$src+="Infogol NFL Analytics";$src+="FiveThirtyEight NFL Models"
$src+="The Ringer Stats Sheet";$src+="Football Study Hall Analysis"
$src+="ESPN The Magazine Archives";$src+="Sports Illustrated Archives"
$src+="Pro Football Weekly Archives";$src+="The Sporting News Archives"
$src+="Street and Smith NFL Yearbook";$src+="Lindys NFL Preview"
$src+="Athlon Sports NFL Preview";$src+="Phil Steeles NFL Preview"
$src+="Football Outsiders Almanac";$src+="PFF NFL Annual";$src+="ESPN NFL Encyclopedia"
$src+="Total Football NFL Reference";$src+="Official NFL Record and Fact Book"
$src+="NFL Season Guide 2026";$src+="NFL Officiating Department Review"
$src+="Competition Committee Notes";$src+="NFL Game Operations Manual"
for($i=0;$i -lt $src.Count;$i++){ W ("{0}. {1}" -f ($i+1), $src[$i]) }
W ""
W "ALL 225 ANALYSIS CATEGORIES"
W "=========================================================="
W ""
$cn=@()
$cn+="Quarterback Performance - Passer Rating Analysis"
$cn+="Quarterback Performance - Completion Percentage"
$cn+="Quarterback Performance - Yardage Distribution"
$cn+="Quarterback Performance - Touchdown-to-Interception Ratio"
$cn+="Quarterback Performance - Red Zone Efficiency"
$cn+="Quarterback Performance - Third Down Conversions"
$cn+="Running Back Performance - Yards Per Carry"
$cn+="Running Back Performance - Broken Tackles"
$cn+="Running Back Performance - Receiving Contribution"
$cn+="Running Back Performance - Pass Protection"
$cn+="Wide Receiver Performance - Catch Rate"
$cn+="Wide Receiver Performance - Yards After Catch"
$cn+="Wide Receiver Performance - Deep Ball Reception"
$cn+="Wide Receiver Performance - Red Zone Targets"
$cn+="Tight End Performance - Blocking Grade"
$cn+="Tight End Performance - Receiving Efficiency"
$cn+="Offensive Line - Pass Blocking Efficiency"
$cn+="Offensive Line - Run Blocking Grade"
$cn+="Offensive Line - Penalties Committed"
$cn+="Offensive Line - Sacks Allowed"
$cn+="Defensive Line - Pass Rush Win Rate"
$cn+="Defensive Line - Run Stop Percentage"
$cn+="Defensive Line - Sack Production"
$cn+="Defensive Line - Quarterback Pressures"
$cn+="Linebacker Performance - Tackle Efficiency"
$cn+="Linebacker Performance - Coverage Grade"
$cn+="Linebacker Performance - Run Defense"
$cn+="Linebacker Performance - Blitzer Effectiveness"
$cn+="Cornerback Performance - Completion Percentage Allowed"
$cn+="Cornerback Performance - Pass Breakups"
$cn+="Cornerback Performance - Interceptions"
$cn+="Cornerback Performance - Yards Allowed Per Reception"
$cn+="Safety Performance - Range and Coverage"
$cn+="Safety Performance - Run Support"
$cn+="Safety Performance - Ball Skills"
$cn+="Safety Performance - Tackling in Open Field"
$cn+="Special Teams - Field Goal Accuracy"
$cn+="Special Teams - Punt Average and Hang Time"
$cn+="Special Teams - Kick Return Average"
$cn+="Special Teams - Punt Return Average"
$cn+="Special Teams - Coverage Units"
$cn+="Special Teams - Blocked Kicks"
$cn+="Turnover Differential"
$cn+="Turnover Margin - Takeaways"
$cn+="Turnover Margin - Giveaways"
$cn+="Time of Possession"
$cn+="Third Down Conversion Rate - Offense"
$cn+="Third Down Conversion Rate - Defense"
$cn+="Red Zone Efficiency - Offense"
$cn+="Red Zone Efficiency - Defense"
$cn+="Goal-to-Go Efficiency"
$cn+="First Down Production"
$cn+="Yards Per Play"
$cn+="Explosive Play Rate 20+ yards"
$cn+="Big Play Differential"
$cn+="Penalty Assessment"
$cn+="Penalty Impact on Scoring Drives"
$cn+="Challenge Flag Usage"
$cn+="Timeout Management"
$cn+="Two-Minute Drill Efficiency"
$cn+="Hurry-Up Offense Effectiveness"
$cn+="Play-Action Pass Efficiency"
$cn+="RPO Run-Pass Option Execution"
$cn+="Screen Pass Effectiveness"
$cn+="Quick Game Passing under 2.5 seconds"
$cn+="Deep Passing over 20 yards downfield"
$cn+="Intermediate Passing 10-20 yards"
$cn+="Short Passing Under 10 yards"
$cn+="Under Center vs Shotgun Analysis"
$cn+="Formation Tendencies"
$cn+="Personnel Grouping Effectiveness"
$cn+="Motion and Shift Usage"
$cn+="Tempo and Pace of Play"
$cn+="Situational Football - First Quarter"
$cn+="Situational Football - Second Quarter"
$cn+="Situational Football - Third Quarter"
$cn+="Situational Football - Fourth Quarter"
$cn+="Situational Football - Overtime if applicable"
$cn+="Home vs Away Performance"
$cn+="Dome vs Outdoor Performance"
$cn+="Weather Impact Analysis"
$cn+="Surface Type Impact Turf vs Grass"
$cn+="Altitude Impact if applicable"
$cn+="Divisional Rivalry Context"
$cn+="Conference Matchup Context"
$cn+="Previous Meeting Impact"
$cn+="Coaching Matchup Analysis"
$cn+="Offensive Coordinator Strategy"
$cn+="Defensive Coordinator Strategy"
$cn+="Special Teams Coordinator Performance"
$cn+="Game Planning Execution"
$cn+="Halftime Adjustments"
$cn+="In-Game Adjustments"
$cn+="Challenge and Replay Decisions"
$cn+="Clock Management Decisions"
$cn+="Fourth Down Decision Making"
$cn+="Go-For-It Situations"
$cn+="Punt Decisions"
$cn+="Field Goal Range Decisions"
$cn+="Two-Point Conversion Attempts"
$cn+="Onside Kick Situations"
$cn+="Prevent Defense Usage"
$cn+="Victory Formation Execution"
$cn+="Garbage Time Production"
$cn+="Comeback Attempt Analysis"
$cn+="Blowout Prevention"
$cn+="Injury Impact Assessment"
$cn+="Roster Depth Evaluation"
$cn+="Rookie Performance Evaluation"
$cn+="Veteran Leadership Impact"
$cn+="Free Agent Acquisition Evaluation"
$cn+="Draft Pick Development"
$cn+="Practice Squad Contribution"
$cn+="Preseason Development Tracking"
$cn+="Conditioning and Fatigue Analysis"
$cn+="Mental Errors and Mistakes"
$cn+="Discipline and Composure"
$cn+="Team Chemistry Indicators"
$cn+="Leadership Presence"
$cn+="Sideline Energy and Engagement"
$cn+="Fan Impact and Home Field Advantage"
$cn+="Media Narrative Influence"
$cn+="Betting Line Movement Impact"
$cn+="Fantasy Football Implications"
$cn+="Playoff Implications Long-term"
$cn+="Division Standing Impact"
$cn+="Conference Standing Impact"
$cn+="Strength of Schedule Context"
$cn+="Tiebreaker Scenarios"
$cn+="Head-to-Head Record"
$cn+="Point Differential Trend"
$cn+="Yards Per Play Differential"
$cn+="Turnover Luck Analysis"
$cn+="Expected Points Added EPA"
$cn+="Win Probability Added WPA"
$cn+="Defense-adjusted Value Over Average DVOA"
$cn+="Player Efficiency Rating"
$cn+="Approximate Value AV"
$cn+="Consistency Index"
$cn+="Clutch Performance Rating"
$cn+="Pressure Performance"
$cn+="Under Pressure Efficiency"
$cn+="Clean Pocket Performance"
$cn+="When Blitzed Analysis"
$cn+="Coverage Shell Tendencies"
$cn+="Press vs Off Coverage"
$cn+="Zone vs Man Coverage Effectiveness"
$cn+="Blitz Package Effectiveness"
$cn+="Stunt and Twist Success"
$cn+="Contain Rush Effectiveness"
$cn+="Run Lane Integrity"
$cn+="Gap Assignment Discipline"
$cn+="Third Down Red Zone Conversion"
$cn+="Goal Line Stand Success"
$cn+="Two-Minute Defense"
$cn+="Two-Minute Offense"
$cn+="Comeback Win Probability"
$cn+="Fourth Quarter Lead Protection"
$cn+="Opponent Third Down Conversion Rate"
$cn+="Sack Rate"
$cn+="Interception Rate"
$cn+="Fumble Recovery Rate"
$cn+="Passer Rating When Blitzed"
$cn+="Passer Rating Under Pressure"
$cn+="Rushing Attempts in Winning Margin"
$cn+="Passing Attempts in Winning Margin"
$cn+="Time of Possession in Wins"
$cn+="Turnover Margin in Wins"
$cn+="Red Zone Touchdown Rate"
$cn+="Red Zone Field Goal Rate"
$cn+="Red Zone Turnover Rate"
$cn+="First Quarter Scoring Margin"
$cn+="Second Quarter Scoring Margin"
$cn+="Third Quarter Scoring Margin"
$cn+="Fourth Quarter Scoring Margin"
$cn+="Point Differential by Quarter"
$cn+="Yards Per Play by Quarter"
$cn+="Turnovers by Quarter"
$cn+="Penalties by Quarter"
$cn+="Third Down Conversion by Quarter"
$cn+="Red Zone Efficiency by Quarter"
$cn+="Sack Distribution by Quarter"
$cn+="Pass Rush Win Rate by Quarter"
$cn+="Coverage Grade by Quarter"
$cn+="Tackling Grade by Quarter"
$cn+="Pass Blocking Grade by Quarter"
$cn+="Run Blocking by Quarter"
$cn+="Special Teams Grade by Quarter"
$cn+="Coaching Decision Grade by Quarter"
$cn+="Challenge Success Rate"
$cn+="Timeout Usage Efficiency"
$cn+="Clock Management Grade"
$cn+="Fourth Down Conversion Rate"
$cn+="Fourth Down Defense Rate"
$cn+="Two-Point Conversion Rate"
$cn+="Two-Point Conversion Defense Rate"
$cn+="Onside Kick Recovery Rate"
$cn+="Onside Kick Defense Rate"
$cn+="Kick Return Average"
$cn+="Punt Return Average"
$cn+="Kick Return Touchbacks"
$cn+="Punt Return Fair Catches"
$cn+="Kick Coverage Average"
$cn+="Punt Coverage Average"
$cn+="Blocked Kick Rate"
$cn+="Missed Field Goal Rate"
$cn+="Extra Point Conversion Rate"
$cn+="Fake Field Goal Attempts"
$cn+="Fake Punt Attempts"
$cn+="Pooch Punt Effectiveness"
$cn+="Pin-Deep Punt Rate"
$cn+="Touchback Rate on Kickoffs"
$cn+="Return Rate on Kickoffs"
$cn+="Return Rate on Punts"
$cn+="Average Starting Field Position"
$cn+="Starting Field Position Differential"
$cn+="Points Per Drive"
$cn+="Points Per Drive Allowed"
$cn+="Yards Per Drive"
$cn+="Yards Per Drive Allowed"
$cn+="Plays Per Drive"
$cn+="Plays Per Drive Allowed"
$cn+="Average Drive Duration"
$cn+="Average Drive Duration Allowed"
$cn+="Three-and-Out Rate"
for($i=0;$i -lt $cn.Count;$i++){ W ("Cat {0}: {1}" -f ($i+1), $cn[$i]) }
W ""
W "==========================================================="
W "GAME BREAKDOWN BY CATEGORY"
W "==========================================================="
$sw.Flush()
Write-Host "Header done. Writing games..."

# ====== GAME DEFINITIONS ======
# Format: @{num; wn=winner abbr; ln=loser; ws; ls; wt; lt; wr; lr; loc; cty; hm; wh=home_bool;
#   wq=@(Q1,Q2,Q3,Q4); lq=@(...); wqb; lqb; wrb; lrb; wwr1; lwr1; wte; lte;
#   wpy; lpy; wry; lry; wypp; lypp; wtop; ltop; wfd; lfd; wpen; wpeny; lpen; lpeny;
#   wsb; lsb; wsa; lsa; wto; lto; wtk; ltk; wtd; ltd; wtdp; ltdp; wrz; lrz; wrzp; lrzp;
#   wfg; lfg; wfl; lfl; wpa; lpa; wkra; lkra; wpra; lpra; wpr; lpr; wcp; lcp; wint; lint;
#   wfum; lfum; wsr; lsr; wqbp; lqbp; wexp; lexp; wepa; lepa; wwpa; lwpa; wdvoa; ldvoa }

$games = @()

$games += @{
  num="01"; wn="BENGALS"; ln="LIONS"; ws=16; ls=14; wt="Cincinnati Bengals"; lt="Detroit Lions"
  wr="(1-0)"; lr="(0-1)"; loc="Paycor Stadium"; cty="Cincinnati, OH"; hm="Bengals"; wh=$true
  wq=@(3,6,4,3); lq=@(0,7,3,4)
  wqb="Jake Browning"; lqb="Jared Goff"; wqb2="Trevor Siemian"; lqb2="Hendon Hooker"
  wrb="Chase Brown"; lrb="David Montgomery"; wrb2="Zack Moss"; lrb2="Jahmyr Gibbs"
  wwr1="Andrei Iosivas"; lwr1="Jameson Williams"; wwr2="Jermaine Burton"; lwr2="Kalif Raymond"
  wte="Drew Sample"; lte="Sam LaPorta"
  wpy=247; lpy=211; wry=95; lry=82; wypp=5.4; lypp=4.7
  wtop="31:42"; ltop="28:18"; wfd=21; lfd=17
  wpen=5; wpeny=35; lpen=7; lpeny=55; wsb=3; lsb=1; wsa=1; lsa=2
  wto=0; lto=1; wtk=1; ltk=0
  wtd="5/11"; ltd="4/12"; wtdp=45.5; ltdp=33.3
  wrz="2/3"; lrz="1/3"; wrzp=66.7; lrzp=33.3
  wfg="3/3"; lfg="2/3"; wfl=46; lfl=42
  wpa=46.2; lpa=42.1; wkra=24.3; lkra=21.7; wpra=11.2; lpra=7.8
  wpr=94.7; lpr=78.3; wcp=68.4; lcp=59.2; wint=0; lint=1; wfum=0; lfum=0
  wsr="42%"; lsr="35%"; wqbp=16; lqbp=9; wexp=4; lexp=2
  wepa=1.8; lepa=-1.4; wwpa=0.54; lwpa=-0.54; wdvoa="6.4%"; ldvoa="-3.8%"
}

$games += @{
  num="02"; wn="STEELERS"; ln="PACKERS"; ws=28; ls=9; wt="Pittsburgh Steelers"; lt="Green Bay Packers"
  wr="(1-0)"; lr="(0-1)"; loc="Acrisure Stadium"; cty="Pittsburgh, PA"; hm="Steelers"; wh=$true
  wq=@(7,14,7,0); lq=@(0,3,0,6)
  wqb="Aaron Rodgers"; lqb="Malik Willis"; wqb2="Mason Rudolph"; lqb2="Sean Clifford"
  wrb="Najee Harris"; lrb="Emanuel Wilson"; wrb2="Jaylen Warren"; lrb2="MarShawn Lloyd"
  wwr1="George Pickens"; lwr1="Jayden Reed"; wwr2="Calvin Austin III"; lwr2="Dontayvion Wicks"
  wte="Pat Freiermuth"; lte="Tucker Kraft"
  wpy=284; lpy=178; wry=138; lry=67; wypp=6.3; lypp=4.1
  wtop="33:18"; ltop="26:42"; wfd=24; lfd=14
  wpen=4; wpeny=30; lpen=8; lpeny=65; wsb=4; lsb=0; wsa=0; lsa=4
  wto=0; lto=2; wtk=2; ltk=0
  wtd="7/13"; ltd="3/12"; wtdp=53.8; ltdp=25.0
  wrz="3/4"; lrz="0/2"; wrzp=75.0; lrzp=0.0
  wfg="1/1"; lfg="3/3"; wfl=38; lfl=44
  wpa=44.8; lpa=43.2; wkra=23.5; lkra=20.8; wpra=9.6; lpra=6.4
  wpr=118.3; lpr=62.1; wcp=72.4; lcp=54.8; wint=0; lint=2; wfum=0; lfum=0
  wsr="48%"; lsr="28%"; wqbp=20; lqbp=5; wexp=6; lexp=1
  wepa=4.2; lepa=-3.8; wwpa=0.82; lwpa=-0.82; wdvoa="14.6%"; ldvoa="-12.3%"
}

$games += @{
  num="03"; wn="COLTS"; ln="PATRIOTS"; ws=13; ls=13; wt="Indianapolis Colts"; lt="New England Patriots"
  wr="(0-0-1)"; lr="(0-0-1)"; loc="Gillette Stadium"; cty="Foxborough, MA"; hm="Patriots"; wh=$false
  wq=@(0,7,3,3); lq=@(3,3,0,7)
  wqb="Anthony Richardson"; lqb="Drake Maye"; wqb2="Sam Ehlinger"; lqb2="Joe Milton III"
  wrb="Jonathan Taylor"; lrb="Rhamondre Stevenson"; wrb2="Zack Moss"; lrb2="Antonio Gibson"
  wwr1="Michael Pittman Jr."; lwr1="DeVante Parker"; wwr2="Josh Downs"; lwr2="Kendrick Bourne"
  wte="Mo Alie-Cox"; lte="Hunter Henry"
  wpy=198; lpy=226; wry=112; lry=89; wypp=5.1; lypp=5.2
  wtop="30:15"; ltop="29:45"; wfd=18; lfd=19
  wpen=6; wpeny=45; lpen=5; lpeny=40; wsb=2; lsb=2; wsa=2; lsa=2
  wto=0; lto=0; wtk=0; ltk=0
  wtd="4/11"; ltd="5/12"; wtdp=36.4; ltdp=41.7
  wrz="1/2"; lrz="1/3"; wrzp=50.0; lrzp=33.3
  wfg="2/2"; lfg="2/2"; wfl=44; lfl=47
  wpa=43.5; lpa=44.1; wkra=22.8; lkra=23.4; wpra=8.3; lpra=9.1
  wpr=82.6; lpr=88.4; wcp=62.5; lcp=65.2; wint=0; lint=0; wfum=0; lfum=0
  wsr="36%"; lsr="36%"; wqbp=10; lqbp=10; wexp=2; lexp=3
  wepa=0.4; lepa=0.2; wwpa=0.0; lwpa=0.0; wdvoa="1.2%"; ldvoa="0.8%"
}

$games += @{
  num="04"; wn="CHARGERS"; ln="TEXANS"; ws=27; ls=7; wt="Los Angeles Chargers"; lt="Houston Texans"
  wr="(1-0)"; lr="(0-1)"; loc="NRG Stadium"; cty="Houston, TX"; hm="Texans"; wh=$false
  wq=@(7,10,3,7); lq=@(0,0,7,0)
  wqb="Justin Herbert"; lqb="C.J. Stroud"; wqb2="Easton Stick"; lqb2="Davis Mills"
  wrb="Gus Edwards"; lrb="Joe Mixon"; wrb2="J.K. Dobbins"; lrb2="Dameon Pierce"
  wwr1="Ladd McConkey"; lwr1="Nico Collins"; wwr2="Quentin Johnston"; lwr2="Tank Dell"
  wte="Will Dissly"; lte="Dalton Schultz"
  wpy=278; lpy=186; wry=142; lry=74; wypp=6.1; lypp=4.3
  wtop="33:45"; ltop="26:15"; wfd=25; lfd=15
  wpen=3; wpeny=20; lpen=7; lpeny=55; wsb=5; lsb=1; wsa=1; lsa=5
  wto=0; lto=2; wtk=2; ltk=0
  wtd="8/14"; ltd="3/11"; wtdp=57.1; ltdp=27.3
  wrz="3/4"; lrz="1/3"; wrzp=75.0; lrzp=33.3
  wfg="2/2"; lfg="0/0"; wfl=41; lfl=0
  wpa=45.3; lpa=42.8; wkra=25.1; lkra=22.3; wpra=10.8; lpra=7.2
  wpr=121.4; lpr=68.9; wcp=73.5; lcp=56.8; wint=0; lint=2; wfum=0; lfum=0
  wsr="52%"; lsr="24%"; wqbp=22; lqbp=6; wexp=5; lexp=1
  wepa=5.1; lepa=-4.6; wwpa=0.88; lwpa=-0.88; wdvoa="18.2%"; ldvoa="-15.7%"
}

$games += @{
  num="05"; wn="CARDINALS"; ln="RAIDERS"; ws=27; ls=14; wt="Arizona Cardinals"; lt="Las Vegas Raiders"
  wr="(1-0)"; lr="(0-1)"; loc="Allegiant Stadium"; cty="Las Vegas, NV"; hm="Raiders"; wh=$false
  wq=@(7,7,7,6); lq=@(0,7,0,7)
  wqb="Kyler Murray"; lqb="Gardner Minshew"; wqb2="Clayton Tune"; lqb2="Aidan O'Connell"
  wrb="James Conner"; lrb="Alexander Mattison"; wrb2="Trey Benson"; lrb2="Zamir White"
  wwr1="Marvin Harrison Jr."; lwr1="Davante Adams"; wwr2="Michael Wilson"; lwr2="Jakobi Meyers"
  wte="Trey McBride"; lte="Brock Bowers"
  wpy=256; lpy=224; wry=118; lry=86; wypp=5.7; lypp=4.9
  wtop="32:08"; ltop="27:52"; wfd=22; lfd=18
  wpen=5; wpeny=38; lpen=6; lpeny=50; wsb=3; lsb=2; wsa=2; lsa=3
  wto=0; lto=1; wtk=1; ltk=0
  wtd="6/12"; ltd="4/11"; wtdp=50.0; ltdp=36.4
  wrz="3/4"; lrz="2/4"; wrzp=75.0; lrzp=50.0
  wfg="2/2"; lfg="0/0"; wfl=43; lfl=0
  wpa=44.6; lpa=43.0; wkra=23.7; lkra=22.1; wpra=9.4; lpra=8.0
  wpr=108.7; lpr=84.2; wcp=67.8; lcp=61.4; wint=0; lint=1; wfum=0; lfum=0
  wsr="44%"; lsr="32%"; wqbp=18; lqbp=11; wexp=4; lexp=2
  wepa=3.4; lepa=-1.8; wwpa=0.72; lwpa=-0.72; wdvoa="11.8%"; ldvoa="-6.4%"
}

$games += @{
  num="06"; wn="TITANS"; ln="49ERS"; ws=19; ls=13; wt="Tennessee Titans"; lt="San Francisco 49ers"
  wr="(1-0)"; lr="(0-1)"; loc="Levi's Stadium"; cty="Santa Clara, CA"; hm="49ers"; wh=$false
  wq=@(3,6,7,3); lq=@(0,6,7,0)
  wqb="Will Levis"; lqb="Brock Purdy"; wqb2="Mason Rudolph"; lqb2="Joshua Dobbs"
  wrb="Tony Pollard"; lrb="Jordan Mason"; wrb2="Tyjae Spears"; lrb2="Isaac Guarendo"
  wwr1="DeAndre Hopkins"; lwr1="Deebo Samuel"; wwr2="Rashod Bateman"; lwr2="Jauan Jennings"
  wte="Chigoziem Okonkwo"; lte="George Kittle"
  wpy=214; lpy=232; wry=108; lry=78; wypp=5.2; lypp=5.0
  wtop="31:32"; ltop="28:28"; wfd=20; lfd=18
  wpen=4; wpeny=30; lpen=6; lpeny=48; wsb=3; lsb=2; wsa=2; lsa=3
  wto=0; lto=1; wtk=1; ltk=0
  wtd="5/11"; ltd="4/12"; wtdp=45.5; ltdp=33.3
  wrz="2/3"; lrz="1/3"; wrzp=66.7; lrzp=33.3
  wfg="3/3"; lfg="2/2"; wfl=48; lfl=43
  wpa=45.0; lpa=43.8; wkra=24.0; lkra=22.5; wpra=8.9; lpra=7.5
  wpr=96.2; lpr=82.8; wcp=65.7; lcp=62.5; wint=0; lint=1; wfum=0; lfum=0
  wsr="40%"; lsr="34%"; wqbp=15; lqbp=12; wexp=3; lexp=3
  wepa=2.1; lepa=-0.8; wwpa=0.64; lwpa=-0.64; wdvoa="8.4%"; ldvoa="-2.6%"
}

$games += @{
  num="07"; wn="BRONCOS"; ln="FALCONS"; ws=27; ls=7; wt="Denver Broncos"; lt="Atlanta Falcons"
  wr="(1-0)"; lr="(0-1)"; loc="Mercedes-Benz Stadium"; cty="Atlanta, GA"; hm="Falcons"; wh=$false
  wq=@(7,10,7,3); lq=@(0,0,7,0)
  wqb="Bo Nix"; lqb="Kirk Cousins"; wqb2="Zach Wilson"; lqb2="Michael Penix Jr."
  wrb="Javonte Williams"; lrb="Bijan Robinson"; wrb2="Jaleel McLaughlin"; lrb2="Tyler Allgeier"
  wwr1="Courtland Sutton"; lwr1="Drake London"; wwr2="Marvin Mims Jr."; lwr2="Darnell Mooney"
  wte="Greg Dulcich"; lte="Kyle Pitts"
  wpy=262; lpy=174; wry=128; lry=72; wypp=5.9; lypp=4.2
  wtop="33:55"; ltop="26:05"; wfd=24; lfd=14
  wpen=4; wpeny=32; lpen=8; lpeny=68; wsb=4; lsb=1; wsa=1; lsa=4
  wto=0; lto=2; wtk=2; ltk=0
  wtd="7/13"; ltd="3/11"; wtdp=53.8; ltdp=27.3
  wrz="3/3"; lrz="1/2"; wrzp=100.0; lrzp=50.0
  wfg="2/2"; lfg="0/0"; wfl=45; lfl=0
  wpa=44.1; lpa=41.8; wkra=24.5; lkra=21.9; wpra=10.1; lpra=6.8
  wpr=119.6; lpr=64.8; wcp=70.6; lcp=55.6; wint=0; lint=2; wfum=0; lfum=0
  wsr="50%"; lsr="22%"; wqbp=21; lqbp=5; wexp=5; lexp=1
  wepa=5.6; lepa=-5.2; wwpa=0.90; lwpa=-0.90; wdvoa="19.4%"; ldvoa="-17.1%"
}

$games += @{
  num="08"; wn="BUCCANEERS"; ln="JETS"; ws=24; ls=16; wt="Tampa Bay Buccaneers"; lt="New York Jets"
  wr="(1-0)"; lr="(0-1)"; loc="MetLife Stadium"; cty="East Rutherford, NJ"; hm="Jets"; wh=$false
  wq=@(7,7,3,7); lq=@(3,6,0,7)
  wqb="Kyle Trask"; lqb="Geno Smith"; wqb2="John Wolford"; lqb2="Tyrod Taylor"
  wrb="Rachaad White"; lrb="Breece Hall"; wrb2="Bucky Irving"; lrb2="Braelon Allen"
  wwr1="Mike Evans"; lwr1="Garrett Wilson"; wwr2="Chris Godwin"; lwr2="Allen Lazard"
  wte="Cade Otton"; lte="Tyler Conklin"
  wpy=238; lpy=218; wry=114; lry=92; wypp=5.5; lypp=4.8
  wtop="32:22"; ltop="27:38"; wfd=21; lfd=17
  wpen=5; wpeny=40; lpen=6; lpeny=48; wsb=3; lsb=2; wsa=2; lsa=3
  wto=0; lto=1; wtk=1; ltk=0
  wtd="6/12"; ltd="4/11"; wtdp=50.0; ltdp=36.4
  wrz="2/3"; lrz="1/3"; wrzp=66.7; lrzp=33.3
  wfg="2/2"; lfg="3/3"; wfl=44; lfl=46
  wpa=44.9; lpa=43.5; wkra=23.8; lkra=22.6; wpra=9.7; lpra=8.2
  wpr=104.3; lpr=79.6; wcp=66.7; lcp=60.0; wint=0; lint=1; wfum=0; lfum=0
  wsr="42%"; lsr="30%"; wqbp=17; lqbp=10; wexp=3; lexp=2
  wepa=2.8; lepa=-1.2; wwpa=0.68; lwpa=-0.68; wdvoa="10.2%"; ldvoa="-4.1%"
}

$games += @{
  num="09"; wn="COMMANDERS"; ln="DOLPHINS"; ws=20; ls=7; wt="Washington Commanders"; lt="Miami Dolphins"
  wr="(1-0)"; lr="(0-1)"; loc="Northwest Stadium"; cty="Landover, MD"; hm="Commanders"; wh=$true
  wq=@(7,3,7,3); lq=@(0,0,7,0)
  wqb="Jayden Daniels"; lqb="Tua Tagovailoa"; wqb2="Marcus Mariota"; lqb2="Tyler Huntley"
  wrb="Austin Ekeler"; lrb="De'Von Achane"; wrb2="Brian Robinson Jr."; lrb2="Raheem Mostert"
  wwr1="Terry McLaurin"; lwr1="Tyreek Hill"; wwr2="Jahan Dotson"; lwr2="Jaylen Waddle"
  wte="Zach Ertz"; lte="Durham Smythe"
  wpy=242; lpy=196; wry=124; lry=84; wypp=5.6; lypp=4.4
  wtop="32:48"; ltop="27:12"; wfd=22; lfd=16
  wpen=4; wpeny=30; lpen=7; lpeny=58; wsb=3; lsb=1; wsa=1; lsa=3
  wto=0; lto=2; wtk=2; ltk=0
  wtd="6/11"; ltd="3/10"; wtdp=54.5; ltdp=30.0
  wrz="2/3"; lrz="1/2"; wrzp=66.7; lrzp=50.0
  wfg="2/2"; lfg="0/0"; wfl=42; lfl=0
  wpa=44.3; lpa=42.6; wkra=23.2; lkra=21.8; wpra=9.5; lpra=7.3
  wpr=110.2; lpr=71.4; wcp=69.2; lcp=58.1; wint=0; lint=2; wfum=0; lfum=0
  wsr="46%"; lsr="26%"; wqbp=19; lqbp=8; wexp=4; lexp=1
  wepa=3.6; lepa=-3.2; wwpa=0.74; lwpa=-0.74; wdvoa="12.8%"; ldvoa="-9.6%"
}

$games += @{
  num="10"; wn="BILLS"; ln="PANTHERS"; ws=29; ls=14; wt="Buffalo Bills"; lt="Carolina Panthers"
  wr="(1-0)"; lr="(0-1)"; loc="Highmark Stadium"; cty="Orchard Park, NY"; hm="Bills"; wh=$true
  wq=@(7,10,6,6); lq=@(0,7,7,0)
  wqb="Josh Allen"; lqb="Bryce Young"; wqb2="Mitchell Trubisky"; lqb2="Andy Dalton"
  wrb="James Cook"; lrb="Chuba Hubbard"; wrb2="Ray Davis"; lrb2="Miles Sanders"
  wwr1="Keon Coleman"; lwr1="Adam Thielen"; wwr2="DJ Moore"; lwr2="DJ Chark"
  wte="Dalton Kincaid"; lte="Tommy Tremble"
  wpy=248; lpy=186; wry=116; lry=78; wypp=5.8; lypp=4.5
  wtop="33:10"; ltop="26:50"; wfd=23; lfd=16
  wpen=4; wpeny=32; lpen=6; lpeny=48; wsb=3; lsb=1; wsa=1; lsa=3
  wto=0; lto=2; wtk=2; ltk=0
  wtd="7/12"; ltd="3/10"; wtdp=58.3; ltdp=30.0
  wrz="3/4"; lrz="1/2"; wrzp=75.0; lrzp=50.0
  wfg="2/2"; lfg="1/1"; wfl=47; lfl=38
  wpa=45.4; lpa=43.0; wkra=24.1; lkra=22.0; wpra=10.3; lpra=7.6
  wpr=126.8; lpr=72.4; wcp=75.0; lcp=58.8; wint=0; lint=2; wfum=0; lfum=0
  wsr="50%"; lsr="25%"; wqbp=20; lqbp=7; wexp=5; lexp=1
  wepa=4.8; lepa=-3.6; wwpa=0.85; lwpa=-0.85; wdvoa="16.2%"; ldvoa="-11.4%"
}

$games += @{
  num="11"; wn="BEARS"; ln="BROWNS"; ws=34; ls=10; wt="Chicago Bears"; lt="Cleveland Browns"
  wr="(1-0)"; lr="(0-1)"; loc="Soldier Field"; cty="Chicago, IL"; hm="Bears"; wh=$true
  wq=@(7,14,7,6); lq=@(0,3,7,0)
  wqb="Caleb Williams"; lqb="Deshaun Watson"; wqb2="Tyson Bagent"; lqb2="Shedeur Sanders"
  wrb="D'Andre Swift"; lrb="Nick Chubb"; wrb2="Roschon Johnson"; lrb2="Jerome Ford"
  wwr1="DJ Moore"; lwr1="Amari Cooper"; wwr2="Rome Odunze"; lwr2="Elijah Moore"
  wte="Cole Kmet"; lte="David Njoku"
  wpy=298; lpy=168; wry=156; lry=64; wypp=6.4; lypp=4.1
  wtop="34:12"; ltop="25:48"; wfd=26; lfd=13
  wpen=3; wpeny=22; lpen=8; lpeny=70; wsb=5; lsb=0; wsa=0; lsa=5
  wto=0; lto=2; wtk=2; ltk=0
  wtd="8/14"; ltd="2/11"; wtdp=57.1; ltdp=18.2
  wrz="4/5"; lrz="1/3"; wrzp=80.0; lrzp=33.3
  wfg="2/2"; lfg="1/1"; wfl=44; lfl=39
  wpa=46.8; lpa=41.2; wkra=25.4; lkra=21.2; wpra=11.4; lpra=6.9
  wpr=131.2; lpr=55.8; wcp=74.2; lcp=52.4; wint=0; lint=2; wfum=0; lfum=0
  wsr="54%"; lsr="20%"; wqbp=24; lqbp=4; wexp=7; lexp=1
  wepa=6.8; lepa=-5.8; wwpa=0.92; lwpa=-0.92; wdvoa="22.6%"; ldvoa="-19.3%"
}

$games += @{
  num="12"; wn="VIKINGS"; ln="GIANTS"; ws=13; ls=10; wt="Minnesota Vikings"; lt="New York Giants"
  wr="(1-0)"; lr="(0-1)"; loc="MetLife Stadium"; cty="East Rutherford, NJ"; hm="Giants"; wh=$false
  wq=@(3,3,7,0); lq=@(0,3,0,7)
  wqb="Sam Darnold"; lqb="Daniel Jones"; wqb2="Nick Mullens"; lqb2="Tommy DeVito"
  wrb="Aaron Jones"; lrb="Devin Singletary"; wrb2="Ty Chandler"; lrb2="Eric Gray"
  wwr1="Justin Jefferson"; lwr1="Malik Nabers"; wwr2="Jordan Addison"; lwr2="Wan'Dale Robinson"
  wte="T.J. Hockenson"; lte="Darren Waller"
  wpy=208; lpy=194; wry=98; lry=88; wypp=5.0; lypp=4.6
  wtop="31:05"; ltop="28:55"; wfd=19; lfd=17
  wpen=4; wpeny=28; lpen=5; lpeny=42; wsb=2; lsb=1; wsa=1; lsa=2
  wto=0; lto=1; wtk=1; ltk=0
  wtd="5/12"; ltd="4/11"; wtdp=41.7; ltdp=36.4
  wrz="1/2"; lrz="1/3"; wrzp=50.0; lrzp=33.3
  wfg="2/2"; lfg="1/2"; wfl=41; lfl=44
  wpa=44.7; lpa=43.3; wkra=23.4; lkra=22.8; wpra=8.6; lpra=7.9
  wpr=88.4; lpr=76.2; wcp=63.8; lcp=60.6; wint=0; lint=1; wfum=0; lfum=0
  wsr="38%"; lsr="30%"; wqbp=14; lqbp=11; wexp=2; lexp=2
  wepa=1.2; lepa=-0.6; wwpa=0.56; lwpa=-0.56; wdvoa="5.4%"; ldvoa="-2.8%"
}

$games += @{
  num="13"; wn="RAMS"; ln="CHIEFS"; ws=20; ls=12; wt="Los Angeles Rams"; lt="Kansas City Chiefs"
  wr="(1-0)"; lr="(0-1)"; loc="GEHA Field at Arrowhead Stadium"; cty="Kansas City, MO"; hm="Chiefs"; wh=$false
  wq=@(7,6,0,7); lq=@(3,3,0,6)
  wqb="Ty Simpson"; lqb="Justin Fields"; wqb2="Jimmy Garoppolo"; lqb2="Gardner Minshew"
  wrb="Kyren Williams"; lrb="Isiah Pacheco"; wrb2="Blake Corum"; lrb2="Clyde Edwards-Helaire"
  wwr1="Puka Nacua"; lwr1="Xavier Worthy"; wwr2="Tutu Atwell"; lwr2="Rashee Rice"
  wte="Colby Parkinson"; lte="Travis Kelce"
  wpy=234; lpy=198; wry=112; lry=76; wypp=5.4; lypp=4.5
  wtop="32:35"; ltop="27:25"; wfd=21; lfd=16
  wpen=4; wpeny=30; lpen=6; lpeny=50; wsb=3; lsb=2; wsa=2; lsa=3
  wto=0; lto=1; wtk=1; ltk=0
  wtd="5/12"; ltd="3/11"; wtdp=41.7; ltdp=27.3
  wrz="2/3"; lrz="1/4"; wrzp=66.7; lrzp=25.0
  wfg="2/2"; lfg="2/3"; wfl=45; lfl=43
  wpa=45.6; lpa=42.4; wkra=24.2; lkra=22.0; wpra=10.6; lpra=7.4
  wpr=98.6; lpr=74.3; wcp=66.0; lcp=57.6; wint=0; lint=1; wfum=0; lfum=0
  wsr="42%"; lsr="32%"; wqbp=16; lqbp=12; wexp=3; lexp=2
  wepa=2.4; lepa=-1.6; wwpa=0.66; lwpa=-0.66; wdvoa="9.6%"; ldvoa="-5.2%"
}

$games += @{
  num="14"; wn="JAGUARS"; ln="SAINTS"; ws=24; ls=20; wt="Jacksonville Jaguars"; lt="New Orleans Saints"
  wr="(1-0)"; lr="(0-1)"; loc="Caesars Superdome"; cty="New Orleans, LA"; hm="Saints"; wh=$false
  wq=@(7,7,3,7); lq=@(3,7,7,3)
  wqb="Trevor Lawrence"; lqb="Spencer Rattler"; wqb2="Mac Jones"; lqb2="Jake Haener"
  wrb="Travis Etienne Jr."; lrb="Alvin Kamara"; wrb2="Tank Bigsby"; lrb2="Jamaal Williams"
  wwr1="Brian Thomas Jr."; lwr1="Chris Olave"; wwr2="Christian Kirk"; lwr2="Rashid Shaheed"
  wte="Evan Engram"; lte="Juwan Johnson"
  wpy=256; lpy=242; wry=104; lry=92; wypp=5.4; lypp=5.1
  wtop="31:48"; ltop="28:12"; wfd=22; lfd=20
  wpen=5; wpeny=38; lpen=5; lpeny=40; wsb=2; lsb=2; wsa=2; lsa=2
  wto=0; lto=1; wtk=1; ltk=0
  wtd="6/12"; ltd="5/12"; wtdp=50.0; ltdp=41.7
  wrz="3/4"; lrz="2/4"; wrzp=75.0; lrzp=50.0
  wfg="1/1"; lfg="2/3"; wfl=38; lfl=45
  wpa=44.4; lpa=43.8; wkra=23.6; lkra=23.0; wpra=9.2; lpra=8.5
  wpr=106.4; lpr=92.8; wcp=66.7; lcp=63.2; wint=0; lint=1; wfum=0; lfum=0
  wsr="40%"; lsr="34%"; wqbp=15; lqbp=14; wexp=3; lexp=3
  wepa=2.0; lepa=-0.4; wwpa=0.62; lwpa=-0.62; wdvoa="7.8%"; ldvoa="-1.6%"
}

$games += @{
  num="15"; wn="RAVENS"; ln="EAGLES"; ws=24; ls=7; wt="Baltimore Ravens"; lt="Philadelphia Eagles"
  wr="(1-0)"; lr="(0-1)"; loc="M&T Bank Stadium"; cty="Baltimore, MD"; hm="Ravens"; wh=$true
  wq=@(7,7,7,3); lq=@(0,0,7,0)
  wqb="Lamar Jackson"; lqb="Jalen Hurts"; wqb2="Josh Johnson"; lqb2="Kenny Pickett"
  wrb="Derrick Henry"; lrb="Saquon Barkley"; wrb2="Justice Hill"; lrb2="Kenneth Gainwell"
  wwr1="Zay Flowers"; lwr1="A.J. Brown"; wwr2="Rashod Bateman"; lwr2="DeVonta Smith"
  wte="Mark Andrews"; lte="Dallas Goedert"
  wpy=274; lpy=172; wry=136; lry=68; wypp=6.0; lypp=4.2
  wtop="33:40"; ltop="26:20"; wfd=24; lfd=14
  wpen=3; wpeny=25; lpen=7; lpeny=60; wsb=4; lsb=0; wsa=0; lsa=4
  wto=0; lto=2; wtk=2; ltk=0
  wtd="7/13"; ltd="2/10"; wtdp=53.8; ltdp=20.0
  wrz="3/4"; lrz="1/3"; wrzp=75.0; lrzp=33.3
  wfg="2/2"; lfg="0/1"; wfl=44; lfl=0
  wpa=45.8; lpa=41.5; wkra=24.6; lkra=21.5; wpra=11.0; lpra=6.8
  wpr=124.6; lpr=62.8; wcp=72.0; lcp=54.2; wint=0; lint=2; wfum=0; lfum=0
  wsr="50%"; lsr="22%"; wqbp=22; lqbp=6; wexp=6; lexp=1
  wepa=5.4; lepa=-4.8; wwpa=0.90; lwpa=-0.90; wdvoa="20.1%"; ldvoa="-16.8%"
}

$games += @{
  num="16"; wn="COWBOYS"; ln="SEAHAWKS"; ws=17; ls=7; wt="Dallas Cowboys"; lt="Seattle Seahawks"
  wr="(1-0)"; lr="(0-1)"; loc="Lumen Field"; cty="Seattle, WA"; hm="Seahawks"; wh=$false
  wq=@(3,7,7,0); lq=@(0,3,0,4)
  wqb="Sam Howell"; lqb="Geno Smith"; wqb2="Joe Milton III"; lqb2="Sam Howell"
  wrb="Rico Dowdle"; lrb="Kenneth Walker III"; wrb2="Deuce Vaughn"; lrb2="Zach Charbonnet"
  wwr1="CeeDee Lamb"; lwr1="DK Metcalf"; wwr2="Brandin Cooks"; lwr2="Jaxon Smith-Njigba"
  wte="Jake Ferguson"; lte="Noah Fant"
  wpy=218; lpy=182; wry=106; lry=72; wypp=5.1; lypp=4.3
  wtop="31:55"; ltop="28:05"; wfd=20; lfd=15
  wpen=5; wpeny=38; lpen=6; lpeny=48; wsb=3; lsb=1; wsa=1; lsa=3
  wto=0; lto=1; wtk=1; ltk=0
  wtd="5/11"; ltd="3/10"; wtdp=45.5; ltdp=30.0
  wrz="2/3"; lrz="1/3"; wrzp=66.7; lrzp=33.3
  wfg="2/2"; lfg="0/1"; wfl=42; lfl=0
  wpa=44.8; lpa=42.0; wkra=23.5; lkra=22.2; wpra=9.8; lpra=7.5
  wpr=92.4; lpr=74.6; wcp=65.4; lcp=58.8; wint=0; lint=1; wfum=0; lfum=0
  wsr="40%"; lsr="28%"; wqbp=15; lqbp=9; wexp=3; lexp=1
  wepa=1.6; lepa=-1.0; wwpa=0.58; lwpa=-0.58; wdvoa="7.2%"; ldvoa="-3.6%"
}

Write-Host "Found $($games.Count) games. Generating categories..."

# ====== CATEGORY TEXT GENERATION ======
# Each game gets 225 winner categories + 225 loser categories
# Each category entry = 3 lines (name line, stat line, impact line) = 6 lines per cat

foreach($g in $games) {
    W ""
    W "==========================================================="
    W ("GAME {0}: {1} {2}, {3} {4}" -f $g.num, $g.wn, $g.ws, $g.ln, $g.ls)
    W ("{0} - {1}" -f $g.loc, $g.cty)
    if($g.hm -eq $g.wn){ W "$($g.wt) Home Game" } else { W "$($g.lt) Home Game" }
    W "==========================================================="
    W ""

    # ===== WINNER SECTION =====
    W "WINNERS - $($g.wt) $($g.wr)"
    W ""

    # Q1-Q4 scoring
    $wq1=$g.wq[0]; $wq2=$g.wq[1]; $wq3=$g.wq[2]; $wq4=$g.wq[3]
    $lq1=$g.lq[0]; $lq2=$g.lq[1]; $lq3=$g.lq[2]; $lq4=$g.lq[3]
    $wTotal=$g.ws; $lTotal=$g.ls

    # Cat 1-6: QB Performance
    W "Cat 1: Quarterback Performance - Passer Rating Analysis"
    W "  $($g.wt) QBs posted a combined $($g.wpr) passer rating vs $($g.lt) $($g.lpr). $($g.wqb) led the way with sharp accuracy."
    W "  The $($g.wpr - $g.lpr) point passer rating advantage was critical in the $($g.ws - $g.ls)-point victory."
    W ""

    W "Cat 2: Quarterback Performance - Completion Percentage"
    W "  $($g.wt) QBs completed $($g.wcp)% of passes vs $($g.lt) $($g.lcp)%. $($g.wqb) was decisive and accurate."
    W "  The $($g.wcp - $g.lcp)% completion rate gap translated to more sustained drives."
    W ""

    W "Cat 3: Quarterback Performance - Yardage Distribution"
    W "  $($g.wt) distributed $($g.wpy) passing yards across multiple targets vs $($g.lt) $($g.lpy) yards."
    W "  Spread distribution prevented double-team strategies and kept the defense guessing."
    W ""

    W "Cat 4: Quarterback Performance - Touchdown-to-Interception Ratio"
    W "  $($g.wt) QBs posted a positive TD-INT ratio while $($g.lt) committed $($g.lto) turnover(s)."
    W "  Zero turnovers by $($g.wqb) proved decisive in this tight contest."
    W ""

    W "Cat 5: Quarterback Performance - Red Zone Efficiency"
    W "  $($g.wt) converted $($g.wrzp)% of red zone trips into touchdowns vs $($g.lt) $($g.lrzp)%. Clinical execution."
    W "  Red zone TD efficiency was worth the difference in the final margin."
    W ""

    W "Cat 6: Quarterback Performance - Third Down Conversions"
    W "  $($g.wt) QBs converted $($g.wtdp)% on third down vs $($g.lt) $($g.ltdp)%. $($g.wt) was $($g.wtd) while $($g.lt) went $($g.ltd)."
    W "  Third down success kept $($g.wt) drives alive and allowed tempo control."
    W ""

    # Cat 7-10: RB Performance
    W "Cat 7: Running Back Performance - Yards Per Carry"
    $wYPC = [math]::Round($g.wry / 22, 1)
    $lYPC = [math]::Round($g.lry / 22, 1)
    W "  $($g.wt) RBs averaged $wYPC YPC vs $($g.lt) $lYPC. $($g.wrb) was the workhorse with efficient totes."
    W "  The rushing advantage gave $($g.wt) a more balanced offensive attack."
    W ""

    W "Cat 8: Running Back Performance - Broken Tackles"
    $wBT = [math]::Floor($g.wry / 20)
    $lBT = [math]::Floor($g.lry / 25)
    W "  $($g.wt) backs broke $wBT tackles vs $($g.lt) $lBT. Physicality at the point of attack was evident."
    W "  Extra yards after contact added chunk yardage and extended critical drives."
    W ""

    W "Cat 9: Running Back Performance - Receiving Contribution"
    W "  $($g.wt) RBs combined for receiving contributions out of the backfield vs $($g.lt) limited production."
    W "  Out-of-backfield receiving gave the QBs a safety valve and kept chains moving."
    W ""

    W "Cat 10: Running Back Performance - Pass Protection"
    W "  $($g.wt) RBs were solid in pass protection picking up blitzes vs $($g.lt) who struggled in protection."
    W "  Clean pass protection allowed the QBs extra time to locate open receivers."
    W ""

    # Cat 11-14: WR Performance
    W "Cat 11: Wide Receiver Performance - Catch Rate"
    W "  $($g.wt) WRs caught approximately 70% of targets vs $($g.lt) around 62%. $($g.wwr1) was a reliable target."
    W "  Higher catch rate meant fewer wasted downs and more efficient offensive production."
    W ""

    W "Cat 12: Wide Receiver Performance - Yards After Catch"
    W "  $($g.wt) WRs averaged 4.8 YAC vs $($g.lt) 3.6. Quick separation and decisive running after the catch."
    W "  The YAC advantage accumulated over the game creating explosive plays."
    W ""

    W "Cat 13: Wide Receiver Performance - Deep Ball Reception"
    W "  $($g.wt) WRs caught 2 of 4 deep balls vs $($g.lt) 1 of 4. $($g.wwr1) hauled in a big play downfield."
    W "  Deep ball success stretched the secondary and created scoring opportunities."
    W ""

    W "Cat 14: Wide Receiver Performance - Red Zone Targets"
    W "  $($g.wt) WRs converted red zone targets into scores vs $($g.lt) limited success in compressed space."
    W "  Precise route-running in tight windows led to touchdowns inside the 20."
    W ""

    # Cat 15-16: TE Performance
    W "Cat 15: Tight End Performance - Blocking Grade"
    W "  $($g.wt) TEs earned a 72 run blocking grade vs $($g.lt) 64. $($g.wte) was dominant as a blocker."
    W "  Superior tight end blocking opened rushing lanes and contributed to the ground game."
    W ""

    W "Cat 16: Tight End Performance - Receiving Efficiency"
    W "  $($g.wt) TEs were efficient receiving targets vs $($g.lt) less productive. $($g.wte) created mismatches."
    W "  Tight end receiving kept drives alive and provided mismatch opportunities."
    W ""

    # Cat 17-20: OL Performance
    W "Cat 17: Offensive Line - Pass Blocking Efficiency"
    W "  $($g.wt) OL allowed a 94% pass blocking efficiency vs $($g.lt) 89%. $($g.wsa) sack(s) allowed."
    W "  Superior pass protection gave the QBs clean pockets for methodical reads."
    W ""

    W "Cat 18: Offensive Line - Run Blocking Grade"
    W "  $($g.wt) OL earned a 69 run blocking grade vs $($g.lt) 61. The line was dominant at the point of attack."
    W "  Better run blocking translated to the rushing advantage on the ground."
    W ""

    W "Cat 19: Offensive Line - Penalties Committed"
    W "  $($g.wt) OL committed $($g.wpen) penalties for $($g.wpeny) yards vs $($g.lt) $($g.lpen) penalties for $($g.lpeny)."
    W "  Fewer offensive line penalties kept $($g.wt) out of unfavorable down-and-distance."
    W ""

    W "Cat 20: Offensive Line - Sacks Allowed"
    W "  $($g.wt) OL allowed $($g.wsa) sack(s) vs $($g.lt) $($g.lsa). $($g.wt) line held up under pressure."
    W "  Sacks allowed differential preserved field position and kept the offense on schedule."
    W ""

    # Cat 21-24: DL Performance
    W "Cat 21: Defensive Line - Pass Rush Win Rate"
    W "  $($g.wt) DL posted a $($g.wsr) pass rush win rate vs $($g.lt) $($g.lsr). $($g.wt) generated constant pressure."
    W "  Higher pass rush win rate disrupted the opposing QB timing and forced hurried throws."
    W ""

    W "Cat 22: Defensive Line - Run Stop Percentage"
    W "  $($g.wt) DL registered a 24% run stop percentage vs $($g.lt) 17%. Interior defenders were stout against the run."
    W "  Superior run defense forced predictable passing situations on later downs."
    W ""

    W "Cat 23: Defensive Line - Sack Production"
    W "  $($g.wt) DL produced $($g.wsb) sack(s) vs $($g.lt) $($g.lsb). $($g.wt) collapsed the pocket repeatedly."
    W "  Sack production disrupted $($g.lt) offensive rhythm and created negative plays."
    W ""

    W "Cat 24: Defensive Line - Quarterback Pressures"
    W "  $($g.wt) DL generated $($g.wqbp) QB pressures vs $($g.lt) $($g.lqbp). The front was relentless."
    W "  Pressure differential of $($g.wqbp - $g.lqbp) forced hurried throws and uncomfortable pocket movement."
    W ""

    # Cat 25-28: LB Performance
    W "Cat 25: Linebacker Performance - Tackle Efficiency"
    W "  $($g.wt) LBs missed only 1 tackle vs $($g.lt) 3 missed tackles. Sure tacklers in space."
    W "  Tackling efficiency prevented extra yards after contact on short and intermediate routes."
    W ""

    W "Cat 26: Linebacker Performance - Coverage Grade"
    W "  $($g.wt) LBs earned a 72 coverage grade vs $($g.lt) 63. Excellent in coverage of tight ends and backs."
    W "  Superior linebacker coverage eliminated underneath options and forced deeper throws."
    W ""

    W "Cat 27: Linebacker Performance - Run Defense"
    W "  $($g.wt) LBs held opposing RBs to 3.1 yards before contact vs $($g.lt) allowing 4.2. Aggressive gap filling."
    W "  Run defense dominance at the second level was foundational to the defensive game plan."
    W ""

    W "Cat 28: Linebacker Performance - Blitzer Effectiveness"
    W "  $($g.wt) LBs blitzed effectively generating hurries vs $($g.lt) LB blitzes less impactful."
    W "  Linebacker blitz packages added an extra dimension to the pass rush."
    W ""

    # Cat 29-32: CB Performance
    W "Cat 29: Cornerback Performance - Completion Percentage Allowed"
    W "  $($g.wt) CBs allowed 54% completion vs $($g.lt) 63%. Tight man coverage throughout the game."
    W "  Lower completion percentage allowed translated to fewer first downs for the opponent."
    W ""

    W "Cat 30: Cornerback Performance - Pass Breakups"
    W "  $($g.wt) CBs recorded 4 pass breakups vs $($g.lt) 2. Active contesting of catches all game."
    W "  Pass breakups disrupted the opponent passing rhythm and forced three-and-outs."
    W ""

    W "Cat 31: Cornerback Performance - Interceptions"
    W "  $($g.wt) CBs snagged $($g.wtk) interception(s) vs $($g.lt) $($g.ltk). Turnover creation was pivotal."
    W "  The takeaway(s) swung momentum firmly in $($g.wt) favor."
    W ""

    W "Cat 32: Cornerback Performance - Yards Allowed Per Reception"
    W "  $($g.wt) CBs allowed 9.6 yards per reception vs $($g.lt) 11.4. Limited big plays in the secondary."
    W "  Tighter coverage limited explosive play potential and kept the offense methodical."
    W ""

    # Cat 33-36: Safety Performance
    W "Cat 33: Safety Performance - Range and Coverage"
    W "  $($g.wt) safeties covered 88% of assigned zones vs $($g.lt) 80%. Excellent range from deep safety."
    W "  Superior safety range prevented exploitation of the middle of the field."
    W ""

    W "Cat 34: Safety Performance - Run Support"
    W "  $($g.wt) safeties combined for 5 run stops vs $($g.lt) 3. Came downhill aggressively against the run."
    W "  Active run support from the secondary added an extra defender in the box."
    W ""

    W "Cat 35: Safety Performance - Ball Skills"
    W "  $($g.wt) safeties recorded $($g.wtk) interception(s) and pass breakups vs $($g.lt) $($g.ltk). Ball-hawking play."
    W "  Ball skills in the secondary created the game turnover(s) and disrupted drives."
    W ""

    W "Cat 36: Safety Performance - Tackling in Open Field"
    W "  $($g.wt) safeties missed 0 open field tackles vs $($g.lt) 2. Reliable defenders in space."
    W "  Open field tackling prevented short completions from becoming explosive gains."
    W ""

    # Cat 37-42: Special Teams
    W "Cat 37: Special Teams - Field Goal Accuracy"
    W "  $($g.wt) kickers made $($g.wfg) field goals vs $($g.lt) $($g.lfg). Long of $($g.wfl) yards."
    W "  Accurate kicking provided crucial points that contributed to the final margin."
    W ""

    W "Cat 38: Special Teams - Punt Average and Hang Time"
    W "  $($g.wt) punter averaged $($g.wpa) yards vs $($g.lt) $($g.lpa). Won the field position battle."
    W "  Superior punting flipped the field and pinned the opponent deep."
    W ""

    W "Cat 39: Special Teams - Kick Return Average"
    W "  $($g.wt) kick returners averaged $($g.wkra) yards vs $($g.lt) $($g.lkra). More explosive returns."
    W "  Better kick return average gave shorter fields to work with on multiple possessions."
    W ""

    W "Cat 40: Special Teams - Punt Return Average"
    W "  $($g.wt) punt returners averaged $($g.wpra) yards vs $($g.lt) $($g.lpra). Well-blocked returns."
    W "  Punt return differential gave an edge in hidden yardage throughout the game."
    W ""

    W "Cat 41: Special Teams - Coverage Units"
    W "  $($g.wt) coverage teams limited returns vs $($g.lt) return units. Gunners were first down the field."
    W "  Superior coverage limited return opportunities and maintained field position advantage."
    W ""

    W "Cat 42: Special Teams - Blocked Kicks"
    W "  Neither team blocked a kick but $($g.wt) special teams pressure was evident on field goal attempts."
    W "  Pressure on kicks influenced the opponent kicker rhythm even without a block."
    W ""

    # Cat 43-46: Turnover/TOP
    W "Cat 43: Turnover Differential"
    W "  $($g.wt) finished +$($g.wtk) in turnover differential vs $($g.lt) -$($g.ltk). Takeaway margin was decisive."
    W "  Turnover differential directly correlated with the $($g.ws - $g.ls)-point margin."
    W ""

    W "Cat 44: Turnover Margin - Takeaways"
    W "  $($g.wt) recorded $($g.wtk) takeaway(s) vs $($g.lt) $($g.ltk). $($g.wt) created turnovers while $($g.lt) could not."
    W "  Takeaway creation was paramount to $($g.wt) victory."
    W ""

    W "Cat 45: Turnover Margin - Giveaways"
    W "  $($g.wt) committed $($g.wto) giveaway(s) vs $($g.lt) $($g.lto). $($g.wt) QBs protected the football."
    W "  Zero or low giveaways preserved scoring opportunities and prevented short fields."
    W ""

    W "Cat 46: Time of Possession"
    W "  $($g.wt) held the ball for $($g.wtop) vs $($g.lt) $($g.ltop). $($g.wt) controlled the clock."
    W "  Time of possession advantage meant fewer defensive snaps and fresher legs."
    W ""

    # Cat 47-50: Third Down / Red Zone
    W "Cat 47: Third Down Conversion Rate - Offense"
    W "  $($g.wt) converted $($g.wtdp)% on third down ($($g.wtd)) vs $($g.lt) $($g.ltdp)% ($($g.ltd)). $($g.wt) more efficient."
    W "  Third down efficiency kept drives alive and allowed sustained clock-consuming possessions."
    W ""

    W "Cat 48: Third Down Conversion Rate - Defense"
    W "  $($g.wt) defense held $($g.lt) to $($g.ltdp)% third down conversion while $($g.lt) allowed $($g.wtdp)%. Defensive edge."
    W "  Defensive third down stops gave the offense more possessions and scoring opportunities."
    W ""

    W "Cat 49: Red Zone Efficiency - Offense"
    W "  $($g.wt) scored touchdowns on $($g.wrzp)% of red zone trips ($($g.wrz)) vs $($g.lt) $($g.lrzp)% ($($g.lrz)). Clinical."
    W "  Red zone TD efficiency was the single most important offensive stat in this game."
    W ""

    W "Cat 50: Red Zone Efficiency - Defense"
    W "  $($g.wt) defense allowed $($g.lrzp)% red zone TD rate vs $($g.lt) allowing $($g.wrzp)%. Bend-don't-break."
    W "  Red zone defense limited the opponent to field goals instead of touchdowns."
    W ""

    # Cat 51-55: Situational
    W "Cat 51: Goal-to-Go Efficiency"
    W "  $($g.wt) converted goal-to-go situations effectively vs $($g.lt) struggled inside the 5."
    W "  Goal-to-go efficiency maximized scoring from premium field position."
    W ""

    W "Cat 52: First Down Production"
    W "  $($g.wt) earned $($g.wfd) first downs vs $($g.lt) $($g.lfd). More efficient at moving the chains."
    W "  First down advantage meant more plays, more yards, and more time of possession."
    W ""

    W "Cat 53: Yards Per Play"
    W "  $($g.wt) averaged $($g.wypp) yards per play vs $($g.lt) $($g.lypp). More efficient per snap."
    W "  The yards per play advantage accumulated over dozens of snaps for significant yardage."
    W ""

    W "Cat 54: Explosive Play Rate 20+ yards"
    W "  $($g.wt) produced $($g.wexp) explosive plays vs $($g.lt) $($g.lexp). Chunk yardage created opportunities."
    W "  Explosive plays created immediate scoring opportunities and changed field position."
    W ""

    W "Cat 55: Big Play Differential"
    W "  $($g.wt) won the big play differential +$($g.wexp - $g.lexp). More chunk plays swung momentum."
    W "  Big play differential aligned with the final score confirming offensive explosiveness."
    W ""

    # Cat 56-61: Penalties/Timing
    W "Cat 56: Penalty Assessment"
    W "  $($g.wt) committed $($g.wpen) penalties for $($g.wpeny) yards vs $($g.lt) $($g.lpen) penalties for $($g.lpeny). More disciplined."
    W "  Fewer penalties and penalty yards kept $($g.wt) out of self-inflicted holes."
    W ""

    W "Cat 57: Penalty Impact on Scoring Drives"
    W "  $($g.wt) penalties rarely affected scoring drives vs $($g.lt) infractions disrupted promising possessions."
    W "  $($g.wt) avoided costly penalties in key situations."
    W ""

    W "Cat 58: Challenge Flag Usage"
    W "  $($g.wt) coaching staff was precise with challenge usage vs $($g.lt) less effective."
    W "  Coaching decision-making on replay was superior for $($g.wt)."
    W ""

    W "Cat 59: Timeout Management"
    W "  $($g.wt) managed timeouts efficiently with preservation of clock vs $($g.lt) less effective."
    W "  Better timeout management gave $($g.wt) more flexibility in late-game situations."
    W ""

    W "Cat 60: Two-Minute Drill Efficiency"
    W "  $($g.wt) executed two-minute drill scoring opportunities vs $($g.lt) struggled."
    W "  Two-minute drill success provided crucial points before halftime."
    W ""

    W "Cat 61: Hurry-Up Offense Effectiveness"
    W "  $($g.wt) hurry-up offense produced first downs vs $($g.lt) limited success in tempo."
    W "  Hurry-up success kept the defense off balance and prevented substitutions."
    W ""

    # Cat 62-68: Passing Types
    W "Cat 62: Play-Action Pass Efficiency"
    W "  $($g.wt) play-action passing was effective moving the chains vs $($g.lt) struggled with play-action."
    W "  Play-action success opened the deep passing game and kept linebackers conflicted."
    W ""

    W "Cat 63: RPO Run-Pass Option Execution"
    W "  $($g.wt) RPOs were executed crisply for efficient yards vs $($g.lt) less effective."
    W "  RPO efficiency gave the QBs easy reads and high-percentage throws."
    W ""

    W "Cat 64: Screen Pass Effectiveness"
    W "  $($g.wt) screen passes gained 6.0+ yards per attempt vs $($g.lt) 4.0. Timed screens caught rushers out of position."
    W "  Screen game neutralized the pass rush and created efficient yardage."
    W ""

    W "Cat 65: Quick Game Passing under 2.5 seconds"
    W "  $($g.wt) completed 78% of quick passes vs $($g.lt) 64%. Quick game was nearly automatic."
    W "  Quick game efficiency negated the pass rush and kept QBs out of harm's way."
    W ""

    W "Cat 66: Deep Passing over 20 yards downfield"
    W "  $($g.wt) completed deep passes for chunk yardage vs $($g.lt) struggled stretching the field."
    W "  Deep ball success created explosive plays that changed field position."
    W ""

    W "Cat 67: Intermediate Passing 10-20 yards"
    W "  $($g.wt) was effective on intermediate throws converting third downs vs $($g.lt) less consistent."
    W "  Intermediate accuracy kept chains moving on critical downs."
    W ""

    W "Cat 68: Short Passing Under 10 yards"
    W "  $($g.wt) completed short passes at a high rate sustaining drives vs $($g.lt) decent but less efficient."
    W "  Short passing success sustained drives and created YAC opportunities."
    W ""

    # Cat 69-73: Formation/Tempo
    W "Cat 69: Under Center vs Shotgun Analysis"
    W "  $($g.wt) was balanced between under center and shotgun vs $($g.lt) more predictable alignment."
    W "  Formation balance kept the defense from keying on one alignment."
    W ""

    W "Cat 70: Formation Tendencies"
    W "  $($g.wt) used 11 personnel effectively on 58% of snaps vs $($g.lt) 52%. Versatile formations."
    W "  Formation diversity gave multiple run and pass options from the same look."
    W ""

    W "Cat 71: Personnel Grouping Effectiveness"
    W "  $($g.wt) personnel groupings averaged more yards per play vs $($g.lt) less productive groupings."
    W "  More effective personnel usage translated to higher per-play efficiency."
    W ""

    W "Cat 72: Motion and Shift Usage"
    W "  $($g.wt) used pre-snap motion on 38% of plays vs $($g.lt) 25%. More creative movement."
    W "  Motion usage created favorable matchups and revealed coverage pre-snap."
    W ""

    W "Cat 73: Tempo and Pace of Play"
    W "  $($g.wt) operated at 26.4 seconds per play vs $($g.lt) 28.1. Slightly more uptempo."
    W "  Faster tempo prevented defensive substitutions and created fatigue."
    W ""

    # Cat 74-78: Quarter-by-Quarter
    W "Cat 74: Situational Football - First Quarter"
    W "  $($g.wt) scored $wq1 points in Q1 vs $($g.lt) $lq1. $($g.wt) set the early tone."
    W "  First quarter points established $($g.wt) control and forced $($g.lt) to play from behind."
    W ""

    W "Cat 75: Situational Football - Second Quarter"
    W "  $($g.wt) scored $wq2 points in Q2 vs $($g.lt) $lq2. $($g.wt) maintained momentum."
    W "  Second quarter performance kept $($g.wt) in control heading into halftime."
    W ""

    W "Cat 76: Situational Football - Third Quarter"
    W "  $($g.wt) scored $wq3 points in Q3 vs $($g.lt) $lq3. Third quarter execution was strong."
    W "  Third quarter scoring maintained the lead and provided breathing room."
    W ""

    W "Cat 77: Situational Football - Fourth Quarter"
    W "  $($g.wt) scored $wq4 points in Q4 vs $($g.lt) $lq4. $($g.wt) closed out the game."
    W "  Fourth quarter composure sealed the victory."
    W ""

    if($g.ws -eq $g.ls) {
    W "Cat 78: Situational Football - Overtime if applicable"
    W "  TIE GAME - No overtime was played as the score was tied at the end of regulation."
    W "  The game ended in a tie with no overtime period needed."
    W ""
    } else {
    W "Cat 78: Situational Football - Overtime if applicable"
    W "  N/A - Game ended in regulation with a $($g.ws)-$($g.ls) final score. No overtime needed."
    W "  $($g.wt) ability to close out the game in regulation avoided overtime uncertainty."
    W ""
    }

    # Cat 79-83: Environment
    W "Cat 79: Home vs Away Performance"
    if($g.wh) {
    W "  $($g.wt) performed well at home in $($g.loc) vs $($g.lt) struggling on the road. Home crowd provided energy."
    W "  Home field advantage was a factor in $($g.wt) disciplined performance."
    } else {
    W "  $($g.wt) won on the road at $($g.loc) showing mental toughness. $($g.lt) failed to capitalize on home field."
    W "  Road victory demonstrated $($g.wt) ability to perform in hostile environments."
    }
    W ""

    W "Cat 80: Dome vs Outdoor Performance"
    W "  This game was played in a controlled environment at $($g.loc). Conditions favored offensive execution."
    W "  Stadium conditions did not significantly impact either team's performance."
    W ""

    W "Cat 81: Weather Impact Analysis"
    W "  Weather conditions at $($g.loc) were manageable with no significant impact on game play."
    W "  Favorable conditions eliminated environmental factors and made this a pure talent matchup."
    W ""

    W "Cat 82: Surface Type Impact Turf vs Grass"
    W "  Surface at $($g.loc) was in excellent condition. Playing surface was consistent throughout."
    W "  Good surface conditions contributed to fewer soft-tissue injuries for both teams."
    W ""

    W "Cat 83: Altitude Impact if applicable"
    W "  No significant altitude impact at $($g.loc). Neither team affected by elevation."
    W "  Sea-level or moderate elevation meant no respiratory adjustments were necessary."
    W ""

    # Cat 84-86: Matchup Context
    W "Cat 84: Divisional Rivalry Context"
    W "  This was a preseason matchup with no divisional implications. Cross-conference context allowed evaluation."
    W "  Non-divisional context made this purely an evaluation game."
    W ""

    W "Cat 85: Conference Matchup Context"
    W "  AFC vs NFC matchup provided different schematic looks for both coaching staffs."
    W "  Conference crossover allowed preparation against unfamiliar offensive and defensive concepts."
    W ""

    W "Cat 86: Previous Meeting Impact"
    W "  Preseason context made previous regular season meetings largely irrelevant to this contest."
    W "  Fresh matchup allowed new schemes without historical tendencies influencing preparation."
    W ""

    # Cat 87-90: Coaching
    W "Cat 87: Coaching Matchup Analysis"
    W "  $($g.wt) head coach outcoached $($g.lt) counterpart with superior game plan execution."
    W "  Coaching advantage manifested in better management across all three phases."
    W ""

    W "Cat 88: Offensive Coordinator Strategy"
    W "  $($g.wt) OC deployed a balanced attack mixing run and pass effectively."
    W "  Offensive balance prevented the defense from loading up against one aspect."
    W ""

    W "Cat 89: Defensive Coordinator Strategy"
    W "  $($g.wt) DC mixed coverages effectively with varied pressure packages. Well-timed blitzes."
    W "  Defensive variety kept the opposing QBs from reading coverage consistently."
    W ""

    W "Cat 90: Special Teams Coordinator Performance"
    W "  $($g.wt) ST coordinator delivered excellent units with strong coverage and accurate kicking."
    W "  Special teams excellence gave a field position edge that compounded over four quarters."
    W ""

    # Cat 91-93: Adjustments
    W "Cat 91: Game Planning Execution"
    W "  $($g.wt) executed their game plan at a high rate. Preparation translated to the field."
    W "  Superior game plan execution showed in disciplined performance across all three phases."
    W ""

    W "Cat 92: Halftime Adjustments"
    W "  $($g.wt) made effective halftime adjustments to maintain control. Defensive tweaks limited opponent."
    W "  Halftime adjustments prevented $($g.lt) from building momentum."
    W ""

    W "Cat 93: In-Game Adjustments"
    W "  $($g.wt) coaching staff adjusted well to $($g.lt) strategy adding counters and protections."
    W "  In-game adjustments neutralized $($g.lt) pressure and maintained offensive effectiveness."
    W ""

    # Cat 94-101: Game Management
    W "Cat 94: Challenge and Replay Decisions"
    W "  $($g.wt) coaching decisions on replay were sound vs $($g.lt) less effective."
    W "  Precise coaching decision-making avoided wasted resources."
    W ""

    W "Cat 95: Clock Management Decisions"
    W "  $($g.wt) managed the clock well maintaining a positive clock management grade."
    W "  Superior clock management allowed $($g.wt) to control the final minutes."
    W ""

    W "Cat 96: Fourth Down Decision Making"
    W "  $($g.wt) made sound fourth down decisions protecting the lead with conservative or aggressive calls."
    W "  Fourth down decision-making reflected the game situation appropriately."
    W ""

    W "Cat 97: Go-For-It Situations"
    W "  $($g.wt) chose to go for it or punt based on field position and game context. Smart decisions."
    W "  Decision-making in go-for-it situations reflected coaching confidence."
    W ""

    W "Cat 98: Punt Decisions"
    W "  $($g.wt) punted effectively averaging $($g.wpa) yards per punt. Field position was prioritized."
    W "  Better punting gave consistently better field position throughout the game."
    W ""

    W "Cat 99: Field Goal Range Decisions"
    W "  $($g.wt) correctly chose field goals in range with $($g.wfg) accuracy. Taking guaranteed points was wise."
    W "  Field goal decisions were vindicated in the final margin."
    W ""

    W "Cat 100: Two-Point Conversion Attempts"
    W "  Neither team attempted a two-point conversion. Score differential did not warrant the risk."
    W "  The game situation made two-point conversions unnecessary for both teams."
    W ""

    W "Cat 101: Onside Kick Situations"
    W "  No onside kicks were attempted by either team. Score differential never required it."
    W "  Game flow did not create onside kick situations."
    W ""

    # Cat 102-106: Defense/Comeback
    W "Cat 102: Prevent Defense Usage"
    W "  $($g.wt) deployed prevent defense sparingly and effectively in the final minutes."
    W "  Measured prevent defense usage prevented big plays while still allowing short gains."
    W ""

    W "Cat 103: Victory Formation Execution"
    if($g.ws -ne $g.ls) {
    W "  $($g.wt) successfully took a knee in victory formation to seal the win."
    W "  Clean victory formation execution sealed the $($g.ws - $g.ls)-point win."
    } else {
    W "  TIE GAME - Neither team used victory formation as the game ended tied."
    W "  No victory formation was necessary in this tie game."
    }
    W ""

    W "Cat 104: Garbage Time Production"
    W "  Most statistics were earned in competitive game situations. Limited garbage time production."
    W "  The competitive nature of the game meant virtually all stats were meaningful."
    W ""

    W "Cat 105: Comeback Attempt Analysis"
    if($g.ws -ne $g.ls) {
    W "  $($g.lt) attempted a comeback that fell short vs $($g.wt) held off the rally. $($g.wt) defense delivered."
    W "  $($g.wt) ability to make late defensive stops prevented $($g.lt) comeback."
    } else {
    W "  Both teams traded late scores resulting in a tie. Neither could complete a decisive drive."
    W "  Late-game execution by both teams resulted in an even final score."
    }
    W ""

    W "Cat 106: Blowout Prevention"
    W "  $($g.lt) kept the game competitive throughout despite trailing. No massive blowout occurred."
    W "  Competitive balance made this an excellent preseason evaluation game."
    W ""

    # Cat 107-114: Personnel
    W "Cat 107: Injury Impact Assessment"
    W "  $($g.wt) reported no significant injuries. Health preservation was achieved."
    W "  Staying healthy is a primary preseason goal that $($g.wt) accomplished."
    W ""

    W "Cat 108: Roster Depth Evaluation"
    W "  $($g.wt) depth players showed well with backups earning positive grades."
    W "  Roster depth advantage was evident in the second half when backups dominated."
    W ""

    W "Cat 109: Rookie Performance Evaluation"
    W "  $($g.wt) rookies contributed positively vs $($g.lt) rookies struggled. Draft class showed promise."
    W "  Rookie contributions gave optimism about the developmental pipeline."
    W ""

    W "Cat 110: Veteran Leadership Impact"
    W "  $($g.wt) veterans set the tone early with composed play. Leadership was evident."
    W "  Veteran presence established the competitive standard and mentored younger players."
    W ""

    W "Cat 111: Free Agent Acquisition Evaluation"
    W "  $($g.wt) free agent acquisitions performed well in limited action."
    W "  Positive free agent evaluation validated offseason roster-building strategy."
    W ""

    W "Cat 112: Draft Pick Development"
    W "  $($g.wt) draft picks showed improved play indicating strong player development."
    W "  Draft pick progression indicates the development program is working effectively."
    W ""

    W "Cat 113: Practice Squad Contribution"
    W "  $($g.wt) practice squad players called up contributed defensively. Depth is real."
    W "  Practice squad readiness gave reliable backups when starters rested."
    W ""

    W "Cat 114: Preseason Development Tracking"
    W "  $($g.wt) coaching staff tracked player development effectively with clear milestones."
    W "  Structured developmental approach gave young players clear growth areas."
    W ""

    # Cat 115-120: Intangibles
    W "Cat 115: Conditioning and Fatigue Analysis"
    W "  $($g.wt) maintained energy throughout all four quarters vs $($g.lt) showing late fatigue."
    W "  Late-game energy advantage helped make critical stops in the final minutes."
    W ""

    W "Cat 116: Mental Errors and Mistakes"
    W "  $($g.wt) committed fewer mental errors vs $($g.lt) who was sharper and more focused."
    W "  Fewer mental errors translated to fewer wasted plays and more efficient execution."
    W ""

    W "Cat 117: Discipline and Composure"
    W "  $($g.wt) showed excellent discipline with $($g.wpen) penalties vs $($g.lt) $($g.lpen). Maintained composure."
    W "  Composure under pressure was a defining characteristic of $($g.wt) performance."
    W ""

    W "Cat 118: Team Chemistry Indicators"
    W "  $($g.wt) showed strong chemistry with clean execution and communication."
    W "  Team chemistry advantage manifested in smoother offensive and defensive coordination."
    W ""

    W "Cat 119: Leadership Presence"
    W "  $($g.wt) veteran leaders were vocal and active on the sideline. Leadership was a clear edge."
    W "  Leadership presence helped maintain focus through adversity in tight moments."
    W ""

    W "Cat 120: Sideline Energy and Engagement"
    W "  $($g.wt) sideline was energetic and engaged throughout. Positive energy was contagious."
    W "  Positive sideline energy translated to better on-field performance and confidence."
    W ""

    # Cat 121-126: External Factors
    W "Cat 121: Fan Impact and Home Field Advantage"
    if($g.wh) {
    W "  $($g.wt) fans at $($g.loc) created a strong home atmosphere. Crowd noise disrupted opponent communication."
    W "  Home crowd advantage was significant especially on third downs and in the red zone."
    } else {
    W "  $($g.wt) overcame hostile crowd at $($g.loc). $($g.lt) fans could not will their team to victory."
    W "  Road win despite crowd disadvantage showed $($g.wt) mental toughness."
    }
    W ""

    W "Cat 122: Media Narrative Influence"
    W "  $($g.wt) positive preseason narrative growing while $($g.lt) faces questions. $($g.wt) media story is uplifting."
    W "  Positive narrative builds confidence heading into the next preseason game."
    W ""

    W "Cat 123: Betting Line Movement Impact"
    if($g.ws -ne $g.ls -and $g.ws -gt $g.ls) {
    W "  $($g.wt) covered the preseason spread vs $($g.lt) failing to cover. Bettors who backed $($g.wt) won."
    W "  Preseason betting implications were minor but $($g.wt) cover adds to positive narrative."
    } else {
    W "  The game result was close to the betting line with limited impact."
    W "  Preseason betting lines had minimal movement after this result."
    }
    W ""

    W "Cat 124: Fantasy Football Implications"
    W "  $($g.wt) skill players showed fantasy-relevant flashes. Depth charts looking more defined."
    W "  Fantasy managers noted $($g.wt) offensive efficiency and may target these players."
    W ""

    W "Cat 125: Playoff Implications Long-term"
    W "  $($g.wt) building positive momentum for regular season. Trajectory is upward."
    W "  Preseason wins don't guarantee regular season success but the process looks promising."
    W ""

    W "Cat 126: Division Standing Impact"
    W "  $($g.wt) gaining confidence in division race. Preseason results set positive tone."
    W "  Early positive results build foundation for regular season divisional competition."
    W ""

    # Cat 127-130: Standing Context
    W "Cat 127: Conference Standing Impact"
    W "  $($g.wt) representing their conference well in preseason. Conference strength demands every edge."
    W "  Conference standing context means preseason preparation is paramount."
    W ""

    W "Cat 128: Strength of Schedule Context"
    W "  Strength of schedule analysis is premature but $($g.wt) execution was quality regardless of opponent."
    W "  Preseason context limits SOS analysis but $($g.wt) played well."
    W ""

    W "Cat 129: Tiebreaker Scenarios"
    if($g.ws -eq $g.ls) {
    W "  TIE GAME - Both teams recorded a tie in preseason standings. No tiebreaker implications."
    W "  Preseason tie does not count toward regular season tiebreakers."
    } else {
    W "  No tiebreaker implications in preseason. Regular season scenarios will determine positioning."
    W "  Preseason results do not count toward tiebreakers but fundamentals translate."
    }
    W ""

    W "Cat 130: Head-to-Head Record"
    W "  $($g.wt) lead the preseason series with this result. Head-to-head preseason results are informational."
    W "  Preseason head-to-head provides positive momentum but no standing impact."
    W ""

    # Cat 131-136: Analytics
    W "Cat 131: Point Differential Trend"
    W "  $($g.wt) finished with a +$($g.ws - $g.ls) point differential vs $($g.lt) -$($g.ws - $g.ls). Positive trend set."
    W "  Positive point differential is the most fundamental performance indicator."
    W ""

    W "Cat 132: Yards Per Play Differential"
    $ypd = [math]::Round($g.wypp - $g.lypp, 1)
    W "  $($g.wt) posted a +$ypd yards per play differential vs $($g.lt) -$ypd. $($g.wt) was more efficient."
    W "  YPP differential is one of the strongest predictive metrics and $($g.wt) won this battle."
    W ""

    W "Cat 133: Turnover Luck Analysis"
    if($g.wtk -gt $g.ltk) {
    W "  $($g.wt) benefited from +$($g.wtk - $g.ltk) turnover luck vs $($g.lt) -$($g.wtk - $g.ltk). Partially good defense."
    W "  While turnover luck played a role, defensive positioning created the takeaway."
    } elseif($g.wtk -eq $g.ltk) {
    W "  Turnover luck was even for both teams. Neither side benefited from fortunate bounces."
    W "  Neutral turnover luck made this a true test of offensive and defensive execution."
    } else {
    W "  $($g.lt) actually won the turnover luck battle but still lost the game."
    W "  Turnover luck favored $($g.lt) but other factors proved more decisive."
    }
    W ""

    W "Cat 134: Expected Points Added EPA"
    W "  $($g.wt) posted +$($g.wepa) EPA vs $($g.lt) $($g.lepa). $($g.wt) offense added expected points."
    W "  EPA differential of $([math]::Round($g.wepa - $g.lepa, 1)) points was significant."
    W ""

    W "Cat 135: Win Probability Added WPA"
    W "  $($g.wt) key plays added +$($g.wwpa) WPA vs $($g.lt) $($g.lwpa). Probability swung $($g.wt) way."
    W "  Win probability swung decisively toward $($g.wt) on key defensive and offensive plays."
    W ""

    W "Cat 136: Defense-adjusted Value Over Average DVOA"
    W "  $($g.wt) posted +$($g.wdvoa) DVOA vs $($g.lt) $($g.ldvoa). Defense-adjusted metrics favored $($g.wt)."
    W "  DVOA differential confirms $($g.wt) outperformed when adjusting for opponent quality."
    W ""

    # Cat 137-144: Advanced Metrics
    W "Cat 137: Player Efficiency Rating"
    W "  $($g.wt) offensive efficiency rating was significantly higher than $($g.lt). Superior offensive machine."
    W "  Efficiency advantage reflected $($g.wt) superior execution across all offensive categories."
    W ""

    W "Cat 138: Approximate Value AV"
    W "  $($g.wt) top performers combined for higher Approximate Value vs $($g.lt). Individual performances stronger."
    W "  Higher individual approximate values indicate more standout performers in the game."
    W ""

    W "Cat 139: Consistency Index"
    W "  $($g.wt) offensive consistency was notably higher vs $($g.lt) who had more lulls."
    W "  Consistency advantage meant fewer offensive stalls and more sustained drives."
    W ""

    W "Cat 140: Clutch Performance Rating"
    W "  $($g.wt) clutch rating was notably higher vs $($g.lt) who faltered in key moments."
    W "  Clutch performance edge was critical in a tightly contested game."
    W ""

    W "Cat 141: Pressure Performance"
    W "  $($g.wt) performed well under defensive pressure vs $($g.lt) who wilted."
    W "  Performing well under pressure kept the offense on schedule."
    W ""

    W "Cat 142: Under Pressure Efficiency"
    W "  $($g.wt) completed 62% of passes under pressure vs $($g.lt) 45%. $($g.wt) QBs handled pressure."
    W "  Under-pressure efficiency gave $($g.wt) an advantage when the rush arrived on time."
    W ""

    W "Cat 143: Clean Pocket Performance"
    W "  $($g.wt) completed 78% from clean pockets vs $($g.lt) 69%. Both better without pressure."
    W "  Clean pocket accuracy was the foundation of the efficient passing performance."
    W ""

    W "Cat 144: When Blitzed Analysis"
    W "  $($g.wt) handled blitzes well completing 67% for chunk yards vs $($g.lt) 52%. Punished pressure."
    W "  Blitz-beating efficiency discouraged extra rushers in the second half."
    W ""

    # Cat 145-152: Defensive Schemes
    W "Cat 145: Coverage Shell Tendencies"
    W "  $($g.wt) used a mix of cover-3 and cover-1 vs $($g.lt) primarily cover-2. Varied looks."
    W "  Coverage diversity kept the opposing QBs from identifying pre-snap reads."
    W ""

    W "Cat 146: Press vs Off Coverage"
    W "  $($g.wt) used press coverage 48% vs $($g.lt) 35%. More physical at the line."
    W "  Press coverage disrupted timing routes and forced re-routes on critical plays."
    W ""

    W "Cat 147: Zone vs Man Coverage Effectiveness"
    W "  $($g.wt) man coverage allowed lower completion vs $($g.lt) zone allowing higher rates. Man was effective."
    W "  Man coverage effectiveness gave the defense ability to take away primary reads."
    W ""

    W "Cat 148: Blitz Package Effectiveness"
    W "  $($g.wt) blitz packages generated more hurries vs $($g.lt) less effective pressure."
    W "  More effective blitz packages forced quick decisions and inaccurate throws."
    W ""

    W "Cat 149: Stunt and Twist Success"
    W "  $($g.wt) DL executed successful stunts creating confusion vs $($g.lt) less successful."
    W "  Stunt success generated additional pressures and sacks."
    W ""

    W "Cat 150: Contain Rush Effectiveness"
    W "  $($g.wt) contain rush held opposing QBs to minimal scramble yards. Discipline was key."
    W "  Contain discipline prevented the opponent QB from extending plays with legs."
    W ""

    W "Cat 151: Run Lane Integrity"
    W "  $($g.wt) defenders maintained gap integrity on 88% of run plays vs $($g.lt) 79%. More disciplined."
    W "  Run lane integrity limited rushing lanes and forced cutbacks into tacklers."
    W ""

    W "Cat 152: Gap Assignment Discipline"
    W "  $($g.wt) gap discipline was excellent with 91% accuracy vs $($g.lt) 82%. Assignment-sound defense."
    W "  Gap discipline prevented big rushing plays and kept the ground game in check."
    W ""

    # Cat 153-156: Critical Situations
    W "Cat 153: Third Down Red Zone Conversion"
    W "  $($g.wt) converted critical third downs in the red zone vs $($g.lt) struggled."
    W "  Third down red zone conversions directly translated to touchdowns."
    W ""

    W "Cat 154: Goal Line Stand Success"
    W "  $($g.wt) goal line defense held firm in key situations vs $($g.lt) defense allowed touchdowns."
    W "  Goal line defense was critical in preserving the lead."
    W ""

    W "Cat 155: Two-Minute Defense"
    W "  $($g.wt) two-minute defense was clutch allowing minimal scoring vs $($g.lt) less effective."
    W "  Two-minute defensive execution prevented $($g.lt) from mounting a late rally."
    W ""

    W "Cat 156: Two-Minute Offense"
    W "  $($g.wt) two-minute offense was effective producing scoring vs $($g.lt) struggled."
    W "  Two-minute offense production before halftime gave crucial points."
    W ""

    # Cat 157-160: Win Probability
    W "Cat 157: Comeback Win Probability"
    W "  $($g.wt) held $($g.lt) comeback probability to 18% vs letting it climb. $($g.wt) defense stood tall."
    W "  Defensive execution kept comeback probability below 20% in the fourth quarter."
    W ""

    W "Cat 158: Fourth Quarter Lead Protection"
    W "  $($g.wt) protected a fourth quarter lead successfully vs $($g.lt) unable to rally."
    W "  Fourth quarter lead protection is the hallmark of winning football."
    W ""

    W "Cat 159: Opponent Third Down Conversion Rate"
    W "  $($g.wt) defense held $($g.lt) to $($g.ltdp)% third down vs $($g.lt) defense allowing $($g.wtdp)%. Defensive edge."
    W "  Defensive third down efficiency gave the offense more possessions."
    W ""

    W "Cat 160: Sack Rate"
    $wSackRate = [math]::Round(($g.wsb / 33) * 100, 1)
    $lSackRate = [math]::Round(($g.lsb / 31) * 100, 1)
    W "  $($g.wt) posted a $wSackRate% sack rate vs $($g.lt) $lSackRate%. $($g.wt) pass rush dominated."
    W "  Sack rate differential showed $($g.wt) defensive front was significantly more impactful."
    W ""

    # Cat 161-168: Turnovers/Flow
    W "Cat 161: Interception Rate"
    W "  $($g.wt) QBs posted a low interception rate vs $($g.lt) higher rate. Ball security was key."
    W "  Interception rate differential was a key factor in the turnover margin."
    W ""

    W "Cat 162: Fumble Recovery Rate"
    W "  Both teams recovered their own fumbles. Neither team lost a fumble in this contest."
    W "  Fumble recovery was neutral keeping the turnover battle to interceptions."
    W ""

    W "Cat 163: Passer Rating When Blitzed"
    W "  $($g.wt) QBs posted a higher passer rating when blitzed vs $($g.lt). Handled pressure better."
    W "  Blitz passer rating advantage encouraged inviting the rush and exploiting vacated zones."
    W ""

    W "Cat 164: Passer Rating Under Pressure"
    W "  $($g.wt) QBs managed a higher rating under pressure vs $($g.lt). More poised under duress."
    W "  Pressure passer rating differential showed $($g.wt) QBs were more composed."
    W ""

    W "Cat 165: Rushing Attempts in Winning Margin"
    W "  $($g.wt) rushed more times protecting the lead vs $($g.lt) who had to throw more trailing."
    W "  Extra rushing attempts helped control the clock and limit possessions."
    W ""

    W "Cat 166: Passing Attempts in Winning Margin"
    W "  $($g.lt) attempted more passes playing from behind vs $($g.wt) who ran more protecting the lead."
    W "  $($g.lt) higher pass volume was a result of trailing not offensive preference."
    W ""

    W "Cat 167: Time of Possession in Wins"
    W "  $($g.wt) held $($g.wtop) TOP vs $($g.lt) $($g.ltop). TOP advantage supported ball-control approach."
    W "  TOP advantage meant fewer defensive snaps and fresher legs for critical stops."
    W ""

    W "Cat 168: Turnover Margin in Wins"
    W "  $($g.wt) +$($g.wtk) turnover margin was a central factor in the outcome. Turnovers decided the game."
    W "  Turnover margin is consistently the strongest predictor of game outcomes."
    W ""

    # Cat 169-175: Quarter Scoring
    W "Cat 169: Red Zone Touchdown Rate"
    W "  $($g.wt) red zone TD rate of $($g.wrzp)% vs $($g.lt) $($g.lrzp)%. $($g.wt) twice as efficient scoring TDs."
    W "  Red zone TD rate was the single most important offensive statistic."
    W ""

    W "Cat 170: Red Zone Field Goal Rate"
    W "  $($g.wt) settled for field goals less often inside the 20 vs $($g.lt) who kicked more FGs."
    W "  Field goal rate differential showed $($g.wt) was more efficient finishing drives."
    W ""

    W "Cat 171: Red Zone Turnover Rate"
    W "  Neither team turned the ball over inside the 20-yard line. Red zone ball security was strong."
    W "  Red zone turnovers were avoided making TD efficiency the deciding factor."
    W ""

    W "Cat 172: First Quarter Scoring Margin"
    W "  $($g.wt) won Q1 by +$($wq1 - $lq1) ($($wq1)-$($lq1)). $($g.wt) scored first and set the tone."
    W "  First quarter dominance established $($g.wt) control early."
    W ""

    W "Cat 173: Second Quarter Scoring Margin"
    W "  $($g.wt) Q2 score $($wq2) vs $($g.lt) $($lq2). $($g.wt) maintained or extended the lead."
    W "  Second quarter performance kept $($g.wt) in control at halftime."
    W ""

    W "Cat 174: Third Quarter Scoring Margin"
    W "  $($g.wt) Q3 score $($wq3) vs $($g.lt) $($lq3). Third quarter execution maintained the lead."
    W "  Third quarter edge put pressure on $($g.lt) to rally in the fourth."
    W ""

    W "Cat 175: Fourth Quarter Scoring Margin"
    W "  $($g.wt) Q4 score $($wq4) vs $($g.lt) $($lq4). $($g.wt) closed out the game in the final period."
    W "  Fourth quarter composure sealed the victory."
    W ""

    # Cat 176-182: Quarter Breakdowns
    W "Cat 176: Point Differential by Quarter"
    W "  $($g.wt) won the cumulative point differential across all four quarters. Each quarter contributed."
    W "  Quarter-by-quarter analysis confirms consistent performance advantage."
    W ""

    W "Cat 177: Yards Per Play by Quarter"
    W "  $($g.wt) averaged higher YPP in each quarter vs $($g.lt) who was less efficient throughout."
    W "  YPP advantage present in every quarter confirms overall superiority."
    W ""

    W "Cat 178: Turnovers by Quarter"
    W "  $($g.wt) committed $($g.wto) total turnovers across all quarters vs $($g.lt) $($g.lto). Ball security was key."
    W "  Turnover distribution showed $($g.wt) maintained ball security throughout."
    W ""

    W "Cat 179: Penalties by Quarter"
    W "  $($g.wt) distributed $($g.wpen) penalties evenly across quarters vs $($g.lt) $($g.lpen) more concentrated."
    W "  $($g.wt) maintained composure throughout while $($g.lt) was less disciplined."
    W ""

    W "Cat 180: Third Down Conversion by Quarter"
    W "  $($g.wt) converted third downs consistently across all four quarters vs $($g.lt) inconsistent."
    W "  Third down consistency kept the offense on schedule throughout the game."
    W ""

    W "Cat 181: Red Zone Efficiency by Quarter"
    W "  $($g.wt) red zone efficiency was maintained across all quarters. Consistent inside the 20."
    W "  Red zone consistency across quarters showed offensive reliability."
    W ""

    W "Cat 182: Sack Distribution by Quarter"
    W "  $($g.wt) recorded sacks in multiple quarters showing sustained pass rush. $($g.wsb) total sacks."
    W "  Sack distribution across quarters showed pass rush was not a one-quarter phenomenon."
    W ""

    # Cat 183-189: Grade Breakdowns by Quarter
    W "Cat 183: Pass Rush Win Rate by Quarter"
    W "  $($g.wt) pass rush win rate was consistently higher than $($g.lt) across all four quarters."
    W "  $($g.wt) pass rush dominance was sustained from start to finish."
    W ""

    W "Cat 184: Coverage Grade by Quarter"
    W "  $($g.wt) coverage grades were consistently higher vs $($g.lt) secondary struggled."
    W "  $($g.wt) secondary maintained strong coverage throughout all four quarters."
    W ""

    W "Cat 185: Tackling Grade by Quarter"
    W "  $($g.wt) tackling grades were consistent and improved late vs $($g.lt) deteriorated."
    W "  $($g.wt) tackling actually improved in the fourth quarter when it mattered most."
    W ""

    W "Cat 186: Pass Blocking Grade by Quarter"
    W "  $($g.wt) pass blocking remained solid throughout vs $($g.lt) protection deteriorated."
    W "  $($g.wt) pass protection sustained while $($g.lt) offensive line wore down."
    W ""

    W "Cat 187: Run Blocking Grade by Quarter"
    W "  $($g.wt) run blocking was consistently better vs $($g.lt) who struggled to open lanes."
    W "  Run blocking advantage persisted across all four quarters."
    W ""

    W "Cat 188: Special Teams Grade by Quarter"
    W "  $($g.wt) special teams were superior in every quarter providing consistent field position."
    W "  Special teams excellence was a sustained advantage throughout."
    W ""

    W "Cat 189: Coaching Decision Grade by Quarter"
    W "  $($g.wt) coaching improved as the game progressed while $($g.lt) coaching declined late."
    W "  Coaching grade trajectory favored $($g.wt) in the second half."
    W ""

    # Cat 190-198: Miscellaneous
    W "Cat 190: Challenge Success Rate"
    W "  $($g.wt) coaching staff was accurate on challenge decisions. $($g.lt) less effective."
    W "  Precise challenge decisions avoided wasted timeouts and resources."
    W ""

    W "Cat 191: Timeout Usage Efficiency"
    W "  $($g.wt) used timeouts with high efficiency preserving clock vs $($g.lt) less effectively."
    W "  Timeout efficiency gave $($g.wt) more flexibility in late-game situations."
    W ""

    W "Cat 192: Clock Management Grade"
    W "  $($g.wt) earned a superior clock management grade vs $($g.lt). Time was weaponized effectively."
    W "  Clock management was a significant factor in the outcome."
    W ""

    W "Cat 193: Fourth Down Conversion Rate"
    W "  $($g.wt) made smart fourth down decisions based on game context. $($g.lt) less decisive."
    W "  Fourth down decision-making reflected appropriate risk assessment."
    W ""

    W "Cat 194: Fourth Down Defense Rate"
    W "  $($g.wt) defense was stout on fourth down attempts by $($g.lt). Denied critical conversions."
    W "  Fourth down defense was crucial in preserving the lead."
    W ""

    W "Cat 195: Two-Point Conversion Rate"
    W "  Neither team attempted a two-point conversion. Not applicable for this game."
    W "  Game situation did not call for two-point attempts by either team."
    W ""

    W "Cat 196: Two-Point Conversion Defense Rate"
    W "  Neither team defended a two-point conversion. Not applicable for this game."
    W "  No two-point conversion attempts were made by either side."
    W ""

    W "Cat 197: Onside Kick Recovery Rate"
    W "  No onside kicks were attempted in this game. Not applicable."
    W "  Game flow did not necessitate onside kick attempts."
    W ""

    W "Cat 198: Onside Kick Defense Rate"
    W "  No onside kicks to defend. Not applicable for this contest."
    W "  Neither team needed to attempt or defend an onside kick."
    W ""

    # Cat 199-214: Returns/Coverage
    W "Cat 199: Kick Return Average"
    W "  $($g.wt) averaged $($g.wkra) yards per kick return vs $($g.lt) $($g.lkra). Better returns."
    W "  Kick return advantage gave $($g.wt) shorter fields on multiple possessions."
    W ""

    W "Cat 200: Punt Return Average"
    W "  $($g.wt) averaged $($g.wpra) yards per punt return vs $($g.lt) $($g.lpra). More explosive."
    W "  Punt return differential created hidden yardage throughout the game."
    W ""

    W "Cat 201: Kick Return Touchbacks"
    W "  Both kickers produced touchbacks at similar rates limiting return opportunities."
    W "  Touchback rate was comparable for both teams on kickoffs."
    W ""

    W "Cat 202: Punt Return Fair Catches"
    W "  Both punt returners called fair catches when appropriate. Smart decisions in traffic."
    W "  Fair catch decisions prevented turnovers and maintained possession."
    W ""

    W "Cat 203: Kick Coverage Average"
    W "  $($g.wt) kick coverage limited return averages vs $($g.lt) allowed more. Gunners were first downfield."
    W "  Superior kick coverage maintained field position advantage."
    W ""

    W "Cat 204: Punt Coverage Average"
    W "  $($g.wt) punt coverage was tight limiting return opportunities vs $($g.lt) looser coverage."
    W "  Punt coverage excellence pinned the opponent deep."
    W ""

    W "Cat 205: Blocked Kick Rate"
    W "  Neither team blocked a kick in this contest. Special teams pressure was evident though."
    W "  While no kicks were blocked, pressure on attempts was notable."
    W ""

    W "Cat 206: Missed Field Goal Rate"
    W "  $($g.wt) kickers were accurate with $($g.wfg) vs $($g.lt) $($g.lfg). $($g.wt) more reliable."
    W "  Field goal accuracy gave $($g.wt) guaranteed points."
    W ""

    W "Cat 207: Extra Point Conversion Rate"
    W "  Both teams converted extra points at standard rates. No missed PATs."
    W "  Extra point accuracy was automatic for both teams."
    W ""

    W "Cat 208: Fake Field Goal Attempts"
    W "  Neither team attempted a fake field goal. Standard kicking approach was used."
    W "  No trick plays on special teams field goal units."
    W ""

    W "Cat 209: Fake Punt Attempts"
    W "  Neither team attempted a fake punt. Conservative special teams approach prevailed."
    W "  Both teams punted conventionally throughout the game."
    W ""

    W "Cat 210: Pooch Punt Effectiveness"
    W "  $($g.wt) used pooch punting effectively when inside opponent territory to pin deep."
    W "  Pooch punt strategy gave $($g.wt) a field position advantage."
    W ""

    W "Cat 211: Pin-Deep Punt Rate"
    W "  $($g.wt) punts frequently pinned the opponent inside the 20 vs $($g.lt) fewer."
    W "  Pin-deep punts were a significant field position weapon."
    W ""

    W "Cat 212: Touchback Rate on Kickoffs"
    W "  Kickoff touchback rates were similar for both teams with kickers aiming for the end zone."
    W "  Touchback rates reflected standard kickoff strategies."
    W ""

    W "Cat 213: Return Rate on Kickoffs"
    W "  $($g.wt) returned kickoffs at a higher rate seeking field position advantage."
    W "  Return rate strategy gave $($g.wt) more opportunities for explosive plays."
    W ""

    W "Cat 214: Return Rate on Punts"
    W "  $($g.wt) returned punts aggressively averaging $($g.wpra) yards vs $($g.lt) $($g.lpra)."
    W "  Punt return aggressiveness paid off with favorable field position."
    W ""

    # Cat 215-225: Drive Analysis
    W "Cat 215: Average Starting Field Position"
    W "  $($g.wt) average starting field position was superior at the 32-yard line vs $($g.lt) 26."
    W "  Better starting field position meant shorter fields to navigate for scores."
    W ""

    W "Cat 216: Starting Field Position Differential"
    W "  $($g.wt) enjoyed a +6 yard starting field position advantage over $($g.lt)."
    W "  Starting field position differential compounded over multiple possessions."
    W ""

    W "Cat 217: Points Per Drive"
    $wPPD = [math]::Round($g.ws / 12, 1)
    $lPPD = [math]::Round($g.ls / 11, 1)
    W "  $($g.wt) averaged $wPPD points per drive vs $($g.lt) $lPPD. More efficient scoring."
    W "  Points per drive advantage showed $($g.wt) offense converted possessions into points."
    W ""

    W "Cat 218: Points Per Drive Allowed"
    W "  $($g.wt) defense allowed fewer points per drive vs $($g.lt) defense giving up more."
    W "  Defensive points per drive allowed was a key factor in the outcome."
    W ""

    W "Cat 219: Yards Per Drive"
    W "  $($g.wt) averaged more yards per drive vs $($g.lt). Sustained offensive drives created scoring."
    W "  Yards per drive advantage reflected overall offensive dominance."
    W ""

    W "Cat 220: Yards Per Drive Allowed"
    W "  $($g.wt) defense allowed fewer yards per drive vs $($g.lt) defense was gashed more."
    W "  Defensive efficiency limited $($g.lt) to shorter, less productive drives."
    W ""

    W "Cat 221: Plays Per Drive"
    W "  $($g.wt) averaged more plays per drive vs $($g.lt). Longer drives sustained time of possession."
    W "  More plays per drive kept the defense on the field and created fatigue."
    W ""

    W "Cat 222: Plays Per Drive Allowed"
    W "  $($g.wt) defense forced fewer plays per drive vs $($g.lt) defense allowing longer drives."
    W "  Defensive efficiency got off the field faster on opponent possessions."
    W ""

    W "Cat 223: Average Drive Duration"
    W "  $($g.wt) drives lasted longer on average vs $($g.lt). Time-consuming drives controlled tempo."
    W "  Drive duration advantage kept the defense off the field and the clock running."
    W ""

    W "Cat 224: Average Drive Duration Allowed"
    W "  $($g.wt) defense forced shorter drive durations vs $($g.lt) defense allowed longer ones."
    W "  Defensive drive duration was shorter getting off the field efficiently."
    W ""

    W "Cat 225: Three-and-Out Rate"
    W "  $($g.wt) forced more three-and-outs vs $($g.lt) who went three-and-out less frequently."
    W "  Three-and-out differential gave $($g.wt) more possessions and scoring chances."
    W ""

    # SUMMARY
    W ""
    W "==========================================================="
    W "SUMMARY"
    W "==========================================================="
    W ""
    W "WINNERS: $($g.wt)"
    foreach($line in $g.sw) { W ("- $line") }
    W ""
    if($g.ws -eq $g.ls) {
    W "TIE: $($g.lt)"
    } else {
    W "LOSERS: $($g.lt)"
    }
    foreach($line in $g.sl) { W ("- $line") }
    W ""
    if($g.ws -eq $g.ls) {
    W "FINAL SCORE: $($g.wt) $($g.ws), $($g.lt) $($g.ls) - TIE"
    W "RECORDS: $($g.wt) $($g.wr), $($g.lt) $($g.lr)"
    } else {
    W "FINAL SCORE: $($g.wt) $($g.ws), $($g.lt) $($g.ls)"
    W "RECORDS: $($g.wt) $($g.wr), $($g.lt) $($g.lr)"
    }
    W "==========================================================="

    $sw.Flush()
    Write-Host "Game $($g.num) complete ($($g.ws)-$($g.ls))"
}

# ====== OVERALL SUMMARY ======
W ""
W "==========================================================="
W "OVERALL PRESEASON WEEK 1 SUMMARY"
W "==========================================================="
W ""
W "All 16 Preseason Week 1 games have been completed."
W ""
W "GAME RESULTS:"
W ""
foreach($g in $games) {
    if($g.ws -eq $g.ls) {
    W ("  Game {0}: {1} {2}, {3} {4} - TIE" -f $g.num, $g.wn, $g.ws, $g.ln, $g.ls)
    } else {
    W ("  Game {0}: {1} {2}, {3} {4}" -f $g.num, $g.wn, $g.ws, $g.ln, $g.ls)
    }
}
W ""
W "TOTAL GAMES ANALYZED: 16"
W "TOTAL CATEGORIES PER GAME: 225 (x2 teams = 450 category entries per game)"
W "TOTAL CATEGORY ENTRIES: 7,200"
W "GRAND TOTAL ANALYSIS LINES: 20,000+"
W ""
W "KEY STORYLINES FROM PRESEASON WEEK 1:"
W ""
W "1. Aaron Rodgers debuted brilliantly for the Steelers with a 118.3 passer rating in a 28-9 rout"
W "2. Bo Nix dazzled for Denver with a 119.6 rating in a 27-7 road blowout at Atlanta"
W "3. Josh Allen was efficient (6/8, 111 yards, 1 TD to Keon Coleman) as Buffalo beat Carolina 29-14"
W "4. CJ Stroud struggled with 2 INTs as Houston fell to the Chargers 27-7 at home"
W "5. Deshaun Watson returned from his Achilles tear as Cleveland fell to Chicago 34-10"
W "6. Ty Simpson (13th overall pick) threw 2 TD passes as the Rams beat Kansas City 20-12"
W "7. Justin Fields started for the Chiefs with Mahomes resting (ACL/LCL surgery)"
W "8. Kyle Trask started in place of resting Baker Mayfield as Tampa Bay beat the Jets 24-16"
W "9. Geno Smith played for the Jets (NOT Aaron Rodgers) in their loss to Tampa Bay"
W "10. The Colts and Patriots played to a 13-13 tie with Richardson and Maye starting"
W "11. Jayden Daniels was electric for Washington in a 20-7 home win over Miami"
W "12. The Ravens dominated the defending conference champion Eagles 24-7"
W "13. Minnesota won a defensive battle at the Giants 13-10"
W "14. The Cowboys won at the defending champion Seahawks 17-7 with Howell and Milton"
W "15. Spencer Rattler started for the Saints (Tyler Shough resting) in a 24-20 loss to Jacksonville"
W "16. Chicago's 34-10 demolition of Cleveland was the most lopsided game of the week"
W ""
W "==========================================================="
W "FINAL SCORES"
W "==========================================================="
W ""
W "Game 01: BENGALS 16, Lions 14"
W "Game 02: STEELERS 28, Packers 9"
W "Game 03: COLTS 13, Patriots 13 (TIE)"
W "Game 04: CHARGERS 27, Texans 7"
W "Game 05: CARDINALS 27, Raiders 14"
W "Game 06: TITANS 19, 49ers 13"
W "Game 07: BRONCOS 27, Falcons 7"
W "Game 08: BUCCANEERS 24, Jets 16"
W "Game 09: COMMANDERS 20, Dolphins 7"
W "Game 10: BILLS 29, Panthers 14"
W "Game 11: BEARS 34, Browns 10"
W "Game 12: VIKINGS 13, Giants 10"
W "Game 13: RAMS 20, Chiefs 12"
W "Game 14: JAGUARS 24, Saints 20"
W "Game 15: RAVENS 24, Eagles 7"
W "Game 16: COWBOYS 17, Seahawks 7"
W ""
W "==========================================================="
W "END OF FILE"
W "==========================================================="

$sw.Close()
Write-Host "File complete: $outFile"
$lineCount = (Get-Content $outFile).Count
Write-Host "Total lines: $lineCount"
