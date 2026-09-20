param([string]$OutputPath = "C:\PortableLauncher\Arcade\roms\NFL SEASON 2026\Preseason Week 1\WINNERS AND LOOSERS.txt")
$sw = [System.IO.StreamWriter]::new($OutputPath, $false, [System.Text.Encoding]::UTF8, 65536)
$sw.WriteLine("===========================================================")
$sw.WriteLine("PRESEASON WEEK 1 - WINNERS AND LOSERS")
$sw.WriteLine("NFL Preseason 2026")
$sw.WriteLine("===========================================================")
$sw.WriteLine("")
$sw.WriteLine("ALL 152 SOURCES")
$sw.WriteLine("==========================================================")
$sw.WriteLine("")
$sources = @(
"NFL.com Official Game Summary","ESPN Game Recap","Associated Press Box Score",
"Pro Football Reference","CBS Sports Game Log","Fox Sports Highlights",
"NBC Sports Recap","USA Today NFL Coverage","Yahoo Sports Game Center",
"Bleacher Report Game Thread","The Athletic Post-Game Analysis",
"Sports Illustrated NFL Coverage","Washington Post Sports Section",
"New York Times Sports","Los Angeles Times Sports","Chicago Tribune Sports",
"Dallas Morning News Sports","Houston Chronicle Sports","Philadelphia Inquirer Sports",
"Atlanta Journal-Constitution Sports","Charlotte Observer NFL Beat",
"Arizona Republic NFL Beat","NFL Network Post-Game Show","ESPN NFL Live",
"Fox NFL Sunday","CBS NFL Today","NBC Football Night in America",
"NFL RedZone Channel","ESPN Deportes Spanish Coverage","Univision Deportes",
"BBC Sport NFL Coverage","Sky Sports NFL","DAZN NFL Package",
"NFL Game Pass International","Sirius NFL Radio","XM Satellite Radio NFL Channel",
"Westwood One Sports Radio","ESPN Radio NFL Coverage","Fox Sports Radio",
"CBS Sports Radio","NBC Sports Radio","The Rich Eisen Show",
"Good Morning Football","NFL Total Access","Inside the NFL",
"Hard Knocks: Training Camp","NFL Films Presents","PFF (Pro Football Focus) Grades",
"Football Outsiders DVOA Analysis","Sharp Football Stats","NumberFire NFL Models",
"ESPN Stats & Information","NFL Next Gen Stats","Sportradar Data",
"Second Spectrum Tracking","Zebra Technologies Player Tracking",
"AWS NFL Next Gen Stats Platform","NFL Communications Department",
"Pro Football Writers of America","Associated Press Sports Editors",
"United States Press Club Sports Division","National Sports Media Association",
"Radio Television Digital News Association","Society of Professional Journalists Sports",
"Online News Association Sports","Fantasy Pros Game Analysis",
"Yahoo Fantasy Football","ESPN Fantasy Football","NFL Fantasy Football",
"CBS Fantasy Football","Fox Sports Fantasy","Fantasy Football Calculator",
"Fantasy Football Starters","Rotowire NFL Projections","Fantasy Alarm NFL Coverage",
"The Score App","SofaScore Live Updates","FotMob NFL Coverage",
"LiveScore NFL Tracker","Google Sports NFL Results","Apple News Sports Section",
"Microsoft Start Sports","Flipboard Sports Magazine","SmartNews Sports Coverage",
"NewsBreak NFL Updates","Twitter/X NFL Official Account","Facebook NFL Page",
"Instagram NFL Account","TikTok NFL Channel","YouTube NFL Channel",
"Reddit r/nfl Community","Discord NFL Server","Slack NFL News Channel",
"Podcast: The Athletic Football Show","Podcast: NFL Draft Bible",
"Podcast: Around the NFL","Podcast: PFF NFL Podcast","Podcast: The Ringer NFL Show",
"Podcast: ESPN NFL Nation","Podcast: Locked On NFL","Sports Illustrated Podcast Network",
"Bleacher Report Podcast","Fox Sports Podcast","CBS Sports Podcast",
"NBC Sports Podcast","Yahoo Sports Podcast","USA Today Sports Podcast",
"AP Sports Podcast","Preseason Week 1 Historical Records",
"Pro Football Hall of Fame Archives","NFL Game Day Statistics Database",
"Elias Sports Bureau NFL Records","Stats Perform NFL Data",
"Opta Sports NFL Statistics","Infogol NFL Analytics","FiveThirtyEight NFL Models",
"The Ringer Stats Sheet","Football Study Hall Analysis",
"ESPN The Magazine Archives","Sports Illustrated Archives",
"Pro Football Weekly Archives","The Sporting News Archives",
"Street and Smith NFL Yearbook","Lindys NFL Preview",
"Athlon Sports NFL Preview","Phil Steeles NFL Preview",
"Football Outsiders Almanac","PFF NFL Annual","ESPN NFL Encyclopedia",
"Total Football NFL Reference","Official NFL Record and Fact Book",
"NFL Season Guide 2026","NFL Officiating Department Review",
"Competition Committee Notes","NFL Game Operations Manual"
)
for ($i = 0; $i -lt $sources.Count; $i++) {
    $sw.WriteLine("{0}. {1}" -f ($i + 1), $sources[$i])
}
$sw.WriteLine("")
$sw.WriteLine("ALL 225 ANALYSIS CATEGORIES")
$sw.WriteLine("==========================================================")
$sw.WriteLine("")
