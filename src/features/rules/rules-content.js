// Authoritative project text supplied by ASG Racing, updated 16 October 2026.
// RU is the original; EN is the corresponding translation for the English UI.
const pair = (ru, en) => ({ru, en});
const item = (code, ru, en, extra = {}) => ({code, text:pair(ru,en), ...extra});
const section = (id, ru, en, items, extra = {}) => ({id, title:pair(ru,en), items, ...extra});
export const RULES_VERSION = '20261016rules1';
export const RULE_LINKS = Object.freeze({
  report:'https://discord.com/channels/1000721957978910740/1491160572601831575',
  strikes:'https://discord.com/channels/1000721957978910740/1543262134236876970',
  contacts:'https://discord.com/channels/1000721957978910740/1559908078453923840/1559908230686318693',
  rejoin:'https://discord.com/channels/1000721957978910740/1559908078453923840/1559908290597490701',
  blue:'https://discord.com/channels/1000721957978910740/1559908078453923840/1559908348348989461',
  defence:'https://discord.com/channels/1000721957978910740/1559908078453923840/1559908404678500463',
  overtake:'https://discord.com/channels/1000721957978910740/1559908078453923840/1559908490921902192',
});
export const COMMUNITY_SECTIONS = [
  section('community-main','Основные правила','General rules',[
    item('1.1','Запрещено неуважительное или оскорбительное отношение к участникам, судьям или администрации проекта.','Disrespectful or insulting behaviour towards participants, stewards or project administrators is prohibited.'),
    item('1.2','Запрещено необоснованно критиковать проект, а также запрещены угрозы в сторону проекта.','Unfounded criticism of the project and threats against the project are prohibited.'),
    item('1.3','Запрещено вводить администрацию в заблуждение, а также искать лазейки в правилах для использования в личных (корыстных) целях.','Misleading the administration or looking for loopholes in the rules for personal gain is prohibited.'),
    item('1.4','Запрещено использование читов, багов, ПО для получения преимущества перед другими игроками.','Using cheats, bugs or software to gain an advantage over other players is prohibited.'),
    item('1.5','Запрещена любая реклама внутри сообщества без разрешения администрации.','Any advertising within the community requires permission from the administration.'),
    item('1.6','Запрещено размещать любую рекламу на сторонних ресурсах без разрешения администрации.','Placing any advertising on third-party resources without permission from the administration is prohibited.'),
    item('1.7','Запрещено выкладывать в публичный доступ внутри сообщества любые платные продукты.','Making any paid products publicly available within the community is prohibited.'),
  ]),
  section('community-chat','Игровой чат и Discord','In-game chat and Discord',[
    item('2.1','Запрещено выдавать себя за члена администрации в игровом чате (голосовом / текстовом), а также на сервере Discord.','Impersonating an administrator in voice or text game chat or on the Discord server is prohibited.'),
    item('2.2','Запрещены любые дискуссии на тему политики, религии, расовых и национальных вопросов.','Discussions of politics, religion, race and nationality are prohibited.'),
    item('2.3','На сервере Discord запрещены спам, реклама других проектов и серверов.','Spam and advertising other projects or servers are prohibited on the Discord server.'),
    item('2.4','Запрещены деанонимизация пользователей сервера (публикация чужих личных данных, таких как IP-адреса, фотографии и т. п.) и угрозы жизни и здоровью в реальной жизни.','Doxxing server users (publishing other people’s personal data, such as IP addresses or photographs) and threats to life or health in real life are prohibited.'),
    item('2.5','Запрещены оскорбления, направленные в сторону семьи и родственников игроков.','Insults directed at players’ families or relatives are prohibited.'),
    item('2.6','Запрещены попытки спровоцировать других игроков на нарушение правил. Также запрещено намеренно создавать конфликтные ситуации в чате: провоцировать, оскорбительно цепляться к игрокам, разжигать споры, подстрекать к агрессии, травле или массовым конфликтам. Подобное поведение рассматривается как нарушение правил независимо от того, удалось ли спровоцировать другого игрока.','Attempts to provoke other players into breaking the rules are prohibited. Deliberately creating conflict in chat is also prohibited: provoking or harassing players, inflaming arguments, or inciting aggression, bullying or widespread conflict. Such behaviour is a violation whether or not another player was successfully provoked.'),
  ]),
  section('community-additional','Дополнительно','Additional provisions',[
    item('3.1','Вы можете зарезервировать номер автомобиля на нашем сайте при условии, что данный номер не занят.','You may reserve a car number on our website provided that the number is available.'),
    item('3.2','Правила сообщества устанавливаются администрацией.','Community rules are established by the administration.'),
    item('3.3','Все вопросы о несогласии с правилами могут быть размещены в разделе «Предложения» и обязательно будут рассмотрены.','Disagreements with the rules may be posted in the Suggestions section and will be reviewed.'),
    item('3.4','Участие в сообществе — добровольное дело каждого, поэтому каждый решает, хочет он с нами быть или нет.','Participation in the community is voluntary; everyone decides whether they wish to be part of it.'),
    item('3.5','Любое мнение для нас интересно — размещайте его в разделе «Предложения».','We welcome opinions: post yours in the Suggestions section.'),
    item('3.6','Если хотите, чтобы администрация помогла решить спор, просто скажите об этом.','If you would like the administration to help resolve a dispute, ask for assistance.'),
    item('3.7','Вектор развития сообщества и направление развития выбирает администрация. Все вопросы относительно этого могут быть размещены в разделе «Предложения».','The administration determines the community’s direction and development. Questions about this may be posted in the Suggestions section.'),
    item('3.8','Если пилот считает, что другой пилот действовал против правил, он имеет право подать репорт с соблюдением формы.','A driver who believes another driver broke the rules may submit a report using the required format.'),
    item('3.9','Администрация сервера оставляет за собой право ограничить доступ или заблокировать пользователя без предварительного уведомления, если имеются основания полагать, что пользователь нарушает правила проекта, обходит блокировку, использует запрещённое ПО или представляет риск для игрового сообщества.','The server administration reserves the right to restrict access or ban a user without prior notice when there are grounds to believe the user is breaking project rules, evading a ban, using prohibited software or posing a risk to the gaming community.'),
    item('3.10','Формулировка «Этого не было в правилах» не освобождает от ответственности. Любые умышленные действия, направленные на дестабилизацию работы сервера, токсичное поведение, вредительство сообществу или срыв мероприятий, будут пресекаться администрацией.','“It was not in the rules” does not remove responsibility. The administration will stop deliberate attempts to destabilise the server, toxic behaviour, harm to the community or disruption of events.'),
  ]),
];
export const RACING_SECTIONS = [
  section('track-main','Правила закрытых гонок','Rules for closed races',[
    item('1.1','Пределы трассы определяются белыми линиями, проходящими по краям гоночного полотна.','Track limits are defined by the white lines along the edges of the racing surface.'),
    item('1.2','Позднее перекрытие не даёт права на место. Неконтролируемая атака запрещена.','Late overlap does not grant the right to space. An uncontrolled attack is prohibited.'),
    item('1.3','Без входа в базу приоритет траектории имеет впереди идущий автомобиль.','Without overlap, the car ahead has priority over the racing line.'),
    item('1.4','В борьбе на прямой разрешено одно изменение траектории.','One change of line is permitted when defending on a straight.',{reference:'defence'}),
    item('1.5','Обгон соперника в повороте разрешён при соблюдении правил борьбы и обгона.','An overtake in a corner is permitted when the racing and overtaking rules are followed.',{reference:'overtake'}),
    item('1.6','Запрещено пересекать линии въезда и выезда из питлейна.','Crossing the pit-entry and pit-exit lines is prohibited.'),
    item('1.7','Зигзаги, повторные смещения, реактивное блокирование и brake test запрещены.','Weaving, repeated moves, reactive blocking and brake testing are prohibited.',{reference:'defence'}),
    item('1.8','Запрещено резко менять траекторию на торможении и выдавливать соперника с трассы.','Sudden changes of line under braking and forcing an opponent off the track are prohibited.'),
    item('1.9','Пилоты обязаны избегать контактов. Пилот, находящийся позади, отвечает за безопасную дистанцию.','Drivers must avoid contact. The driver behind is responsible for maintaining a safe distance.'),
    item('1.10','Чат во время гонки запрещён, за исключением случаев, обозначенных судьями.','Chat during the race is prohibited except in situations specified by the stewards.'),
    item('1.11','Позиция, полученная вне трассы, возвращается в течение одного круга. Штраф за нарушение — 5 секунд.','A position gained off track must be returned within one lap. The penalty for a violation is 5 seconds.'),
    item('1.12','Болид считается покинувшим трассу, если менее двух колёс находятся в пределах трассы или касаются её.','A car is considered off track if fewer than two wheels are within or touching the track.'),
    item('1.13','При синем флаге круговой не защищается и пропускает в текущем секторе. Круговой имеет право вернуться в круг.','Under blue flags, a lapped driver must not defend and must let the faster car through within the current sector. A lapped driver may unlap themselves.',{reference:'blue'}),
    item('1.14','Репорты подаются с указанием участников, круга, времени и доказательств. Администрация вправе назначить санкции или бан; решение можно оспорить.','Reports must identify the participants, lap, time and evidence. The administration may impose sanctions or a ban; the decision may be appealed.'),
    item('1.15','Администрация оставляет за собой право заблокировать участника за опасную езду и повторные грубые нарушения.','The administration reserves the right to ban a participant for dangerous driving or repeated serious violations.'),
    item('1.16','«Что не запрещено — разрешено» не является оправданием для неспортивного поведения, умышленного создания аварийных ситуаций или иных действий, наносящих вред участникам гонки.','“Anything not prohibited is permitted” does not justify unsporting conduct, deliberately creating dangerous situations or otherwise harming participants.'),
  ]),
  section('track-overtake','Обгон и борьба в повороте','Overtaking and racing in corners',[
    item('','Началом манёвра поворота признаётся момент первоначального изменения направления движения болида, определяемый как направленное воздействие на рулевое управление (угол поворота рулевого колеса) в сторону апекса.','Turn-in begins at the initial change in the car’s direction, defined by a steering input towards the apex.'),
    item('','Борьба начинается, если атакующий до поворота вошёл передним бампером в базу соперника. База начинается от оси заднего колеса.','A battle begins when the attacking car’s front bumper enters the opponent’s overlap zone before turn-in. The zone begins at the rear axle.'),
    item('','При входе в базу оба пилота оставляют минимум одну ширину автомобиля до белой линии.','Once overlap is established, both drivers must leave at least one car width to the white line.'),
    item('','Место сохраняется на входе, в апексе и на выходе, пока автомобиль находится в базе.','Space must be maintained at entry, apex and exit for as long as overlap exists.'),
    item('','Обгон завершён, когда перекрытия нет, обгоняющий впереди, а возврат безопасен.','An overtake is complete when overlap has ended, the overtaking car is ahead and returning to the line is safe.'),
    item('','Без входа в базу приоритет траектории имеет впереди идущий автомобиль.','Without overlap, the car ahead has priority over the racing line.'),
    item('','На торможении можно входить в базу, соблюдая вышеуказанные пункты.','Overlap may be established under braking provided that the above rules are followed.'),
  ],{reference:'overtake'}),
  section('track-defence','Правило одной смены траектории','The one-move rule',[
    item('4.1','Гонщику, защищающему свою позицию на прямой, разрешается сместиться со своей траектории только один раз. Виляние из стороны в сторону (double move) категорически запрещено.','A driver defending a position on a straight may change line only once. Weaving from side to side (a double move) is strictly prohibited.'),
    item('4.2','Если пилот сместился внутрь для защиты позиции, а перед поворотом решает вернуться обратно на внешнюю (гоночную) траекторию, он имеет на это право, но обязан оставить ширину как минимум одного корпуса автомобиля между своей машиной и краем трассы. Это необходимо, чтобы не «захлопнуть дверь» перед соперником, который уже успел занять место на гоночной траектории.','A driver who moves to the inside to defend may return to the outside racing line before a corner, but must leave at least one car width between their car and the edge of the track. This avoids closing the door on an opponent who has already taken that space.'),
    item('4.3','Любые аномальные изменения траектории, намеренное выдавливание соперника за белую линию или блокировка в зоне торможения (moving under braking) строго запрещены и рассматриваются стюардами как опасное пилотирование. Белые линии определяют пределы трассы.','Abnormal changes of line, deliberately forcing an opponent beyond the white line, and moving under braking to block are strictly prohibited and treated as dangerous driving. White lines define track limits.'),
  ],{reference:'defence'}),
  section('track-rejoin','Безопасное возвращение на трассу','Rejoining the track safely',[
    item('','Если машина покинула пределы гоночного полотна по любой причине, пилот может вернуться на трек только тогда, когда это безопасно, и без получения какого-либо долгосрочного преимущества.','If a car leaves the racing surface for any reason, it may rejoin only when safe and without gaining a lasting advantage.'),
    item('','В процессе разворота зажмите педаль тормоза «в пол». Удерживайте её, даже если машина вылетела на траву или гравий.','During a spin, press the brake pedal fully and hold it down, even if the car has gone onto grass or gravel.'),
    item('','Не пытайтесь сразу тронуться с места. Полностью остановитесь, зафиксируйте машину, оцените обстановку по зеркалам, дождитесь, пока проедет плотная группа автомобилей (пелотон), и только после этого безопасно развернитесь и продолжайте движение.','Do not try to move immediately. Stop completely, secure the car, check your mirrors and wait for the tightly grouped traffic to pass. Only then turn around safely and continue.'),
    item('','Возврат на трассу должен происходить под максимально возможным острым углом.','Rejoin at the shallowest angle possible.'),
    item('','Небезопасное возвращение на трек с нарушением указанных обязанностей наказывается более жёсткими штрафами.','An unsafe rejoin that disregards these duties is subject to more severe penalties.'),
  ],{reference:'rejoin'}),
  section('track-blue','Пилот под синими флагами','A driver under blue flags',[
    item('3.1','Круговой пилот — участник гонки, уступивший лидеру дистанцию в целый круг из-за потери темпа, аварии, пит-стопа или поломки. Маршалы и световые панели начинают показывать синий флаг, когда расстояние между лидером и круговым сокращается примерно до 1,2–1,5 секунды (в зависимости от серии и трассы). С этого момента круговой обязан подготовиться к пропуску.','A lapped driver has fallen a full lap behind the leader because of pace, an accident, a pit stop or a failure. Marshals and light panels show blue flags as the gap drops to approximately 1.2–1.5 seconds, depending on the series and track. The lapped driver must then prepare to let the leader pass.'),
    item('3.2','После сообщения по радио о приближении лидеров или появления синего флага оцените обстановку сзади, продумайте безопасное место для пропуска и будьте предсказуемы.','When informed over the radio of approaching leaders or shown a blue flag, check behind you, plan a safe place to let them pass and remain predictable.'),
    item('','Если пилот, опережающий вас на круг, приблизился на расстояние менее 0,5 секунды, безопасно пропустите его при первой возможности. Если безопасно пропустить не получается — сделайте это в течение одного сектора (30–45 секунд).','If a driver lapping you closes to less than 0.5 seconds, let them pass safely at the first opportunity. If that is not immediately safe, do so within one sector (30–45 seconds).'),
    item('','Если круговой находится в борьбе с другим круговым, оба пилота обязаны безопасно пропустить на прямой.','If two lapped drivers are battling, both must safely let the leader pass on a straight.'),
    item('3.3','Категорически запрещается смещаться с гоночной траектории в последний момент, менять траекторию для защиты, препятствовать или блокировать лидера и пытаться с ним «сражаться».','Last-moment moves off the racing line, defensive changes of line, impeding or blocking the leader, and attempting to battle the leader are strictly prohibited.'),
    item('3.4','Наказание зависит от тяжести последствий: от предупреждения до DSQ. Судья выбирает наказание по совокупности нарушенных пунктов.','Penalties depend on the severity of the consequences, from a warning to DSQ. The steward decides based on the combined violations.'),
    item('3.5','Пилот, получивший синий флаг, имеет право вернуться в круг при соблюдении вышеуказанных действий.','A driver shown blue flags may unlap themselves while following the rules above.'),
    item('','Для безопасного пропуска автомобиля оцените обстановку, по возможности уйдите с боевой траектории и снизьте скорость.','To let a car pass safely, assess the situation, move off the racing line where possible and reduce speed.'),
  ],{reference:'blue'}),
];
const penalty = (code,ru,en,value) => item(code,ru,en,{penalty:value});
export const PENALTY_SECTIONS = [
  section('penalties-general','Общая штрафная сетка','General penalty schedule',[
    penalty('2.1','Контакт пилота.','Contact between drivers.',pair('Сетка контактов','Contact schedule')),
    penalty('2.2','Небезопасное возвращение на трек.','Unsafe rejoin.',pair('Сетка возвращений','Rejoin schedule')),
    penalty('2.3','Отбор позиции с нарушением правил обгона, без контакта и без возврата позиции.','Taking a position in breach of overtaking rules, without contact and without returning it.',pair('5 секунд','5 seconds')),
    penalty('2.4','Повторная смена траектории.','Repeated change of line.',pair('Сетка контактов','Contact schedule')),
    penalty('2.5','Brake test на прямой.','Brake test on a straight.',pair('DT / SG30','DT / SG30')),
    penalty('2.6','Намеренное и систематическое оттормаживание соперника или систематическое блокирование.','Deliberate, repeated slowing of an opponent or systematic blocking.',pair('5 секунд / DT','5 seconds / DT')),
    penalty('2.7','Первое игнорирование синего флага.','First failure to observe blue flags.',pair('5–10 секунд, вплоть до DSQ','5–10 seconds, up to DSQ')),
    penalty('2.8','Пересечение линии въезда или выезда из питлейна.','Crossing the pit-entry or pit-exit line.',pair('10 секунд','10 seconds')),
    penalty('2.9','Систематические срезки или объезд трассы.','Repeated corner cutting or bypassing the track.',pair('DT / DSQ','DT / DSQ')),
    penalty('2.10','Помеха автомобилю на быстром круге.','Impeding a car on a fast lap.',pair('Предупреждение / штраф стартовых позиций','Warning / grid-position penalty')),
    penalty('2.11','Опасная езда или повторные нарушения.','Dangerous driving or repeated violations.',pair('DSQ','DSQ')),
    penalty('2.12','Использование чата в гонке.','Using chat during the race.',pair('Предупреждение / 15 секунд / kick','Warning / 15 seconds / kick')),
    penalty('2.13','Читы, подмена пилота, саботаж или обход наказания.','Cheating, driver substitution, sabotage or evading a penalty.',pair('BAN','BAN')),
  ]),
  section('penalties-contact','Аварии и контакты','Accidents and contact',[
    penalty('2.1.1','Незначительный или первичный контакт без последствий и с возвратом позиции.','Minor or initial contact without consequences and with the position returned.',pair('Гоночный инцидент','Racing incident')),
    penalty('2.1.2','Создание опасной ситуации на трассе в результате неосмотрительных действий гонщика.','Creating a dangerous situation through a driver’s careless actions.',pair('5 секунд','5 seconds')),
    penalty('2.1.3','Незначительный контакт с обгоном или потерей позиции без возврата позиции.','Minor contact leading to an overtake or a lost position, without returning the position.',pair('5 секунд','5 seconds')),
    penalty('2.1.4','Контакт с разворотом соперника.','Contact that spins an opponent.',pair('15 секунд','15 seconds')),
    penalty('2.1.5','Контакт с разворотом или серьёзными повреждениями одной или двух машин.','Contact causing a spin or serious damage to one or two cars.',pair('DT','DT')),
    penalty('2.1.6','Контакт, приведший к массовой аварии: 3 и более машины.','Contact causing a pile-up involving 3 or more cars.',pair('SG30','SG30')),
    penalty('2.1.7','Повторяющиеся или опасные действия.','Repeated or dangerous actions.',pair('DSQ','DSQ')),
    penalty('2.1.8','Намеренный контакт, таран или месть.','Deliberate contact, ramming or retaliation.',pair('DSQ / STRIKE / BAN','DSQ / STRIKE / BAN')),
  ],{reference:'contacts'}),
  section('penalties-rejoin','Небезопасное возвращение','Unsafe rejoin penalties',[
    penalty('2.2.1','Без контакта, но с последовавшей аварией.','Without contact, but causing an accident.',pair('10 секунд','10 seconds')),
    penalty('2.2.2','С контактом.','With contact.',pair('15 секунд','15 seconds')),
    penalty('2.2.3','С контактом, повлёкшим разворот.','With contact causing a spin.',pair('20 секунд','20 seconds')),
    penalty('2.2.4','С контактом и потерей двух и более позиций.','With contact and the loss of two or more positions.',pair('25 секунд','25 seconds')),
    penalty('2.2.5','С разворотом или серьёзными повреждениями одной или двух машин.','With a spin or serious damage to one or two cars.',pair('SG30','SG30')),
    penalty('2.2.6','С массовой аварией.','With a pile-up.',pair('DSQ и отстранение от следующей гонки','DSQ and suspension from the next race')),
  ],{reference:'rejoin'}),
];
export const PENALTY_NOTES = [
  pair('Позицию, полученную вне трассы, необходимо вернуть в течение одного круга. Штраф за невозврат — 5 секунд.','A position gained off track must be returned within one lap. Failure to return it carries a 5-second penalty.'),
  pair('Наказание может изменяться с учётом последствий, умысла и повторяемости.','A penalty may be adjusted for consequences, intent and repeated behaviour.'),
  pair('Намеренное оттормаживание соперника является снижением темпа времени круга на ±20% без учёта борьбы и вылета с трассы.','Deliberately slowing an opponent means a reduction in lap-time pace of ±20%, excluding battles and excursions off track.'),
];
export const COPYRIGHT = pair(
  'Данный свод правил является интеллектуальной собственностью администрации проекта ASG Racing и разработан с учётом специфики сообщества. Полное или частичное копирование, заимствование формулировок, адаптация или публикация данного текста на сторонних ресурсах (серверах, сайтах, форумах) без предварительного письменного согласия правообладателя категорически запрещены. Нарушение данного запрета повлечёт за собой меры по защите авторских прав в рамках платформ размещения.',
  'These rules are the intellectual property of the ASG Racing project administration and were developed for this community. Copying all or part of the text, borrowing its wording, adapting it or publishing it on third-party resources (servers, websites or forums) without prior written permission from the rights holder is strictly prohibited. Violations will result in copyright protection measures through the hosting platforms.'
);
export const SUBMISSION_FIELDS = {
  report:[
    pair('Дата и время: 03.10.26, 12:00–15:00','Date and time: 03 Oct 2026, 12:00–15:00'),
    pair('Сервер: ASG Server Monza — Live Leaderboard','Server: ASG Server Monza — Live Leaderboard'),
    pair('Ваш никнейм: [укажите никнейм]','Your nickname: [enter nickname]'),
    pair('Никнейм нарушителя: [укажите никнейм]','Other driver’s nickname: [enter nickname]'),
    pair('Нарушение: [контакт с разворотом / неспортивное поведение / другое]','Violation: [contact causing a spin / unsporting conduct / other]'),
    pair('Доказательство: [ссылка на видео или скриншот]','Evidence: [video or screenshot link]'),
    pair('Реплей: круг 5, время 08:43, ваш номер 415, номер нарушителя 221','Replay: lap 5, time 08:43, your number 415, other driver’s number 221'),
    pair('Чего хотите добиться: [предупреждение / страйк / бан]','Requested outcome: [warning / strike / ban]'),
    pair('Дополнения: [свободная форма]','Additional information: [free text]'),
  ],
  protest:[
    pair('Дата и время: 03.10.26, 12:00–15:00','Date and time: 03 Oct 2026, 12:00–15:00'),
    pair('Место: [Discord / сервер / страйк / сайт]','Where: [Discord / server / strike / website]'),
    pair('Ваш никнейм: [укажите никнейм]','Your nickname: [enter nickname]'),
    pair('С чем вы не согласны: [незаслуженный бан или наказание]','What you disagree with: [unjustified ban or penalty]'),
    pair('Доказательство: [ссылка на видео, скриншот или репорт в Discord]','Evidence: [video, screenshot or Discord report link]'),
    pair('Реплей, если имеется: круг 2, время 04:30, ваш номер 324','Replay, if available: lap 2, time 04:30, your number 324'),
    pair('Чего хотите добиться: [например, снятие блокировки]','Requested outcome: [for example, removal of a ban]'),
    pair('Дополнения: [свободная форма]','Additional information: [free text]'),
  ],
};
