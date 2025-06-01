// Cyberpunk Mission Control JavaScript

// Global variables
const deadAir = document.getElementById("deadAir");
let greetingHasFinished = false;
let isCallActive = false;
let isEightiesMode = false;
let transcriptState = {
  isVisible: false,
  currentSegmentIndex: 0,
  interval: null,
  currentLanguage: 'en'
};

// Transcript data for orientation video
const transcriptData = {
  en: [
    {
      time: 0,
      text: "Greetings and welcome, Earthling. I have pre-recorded this communication as your orientation.",
    },
    {
      time: 5,
      text: "For your amusement, double-click to fire projectiles at the moons. Don't worry - this won't harm or break anything.",
    },
    {
      time: 11,
      text: "Next, please note that A single long click on the floor of the scene will instantiate a green candle there which may serve as an offering to Our Lady of Perpetual Profit.",
    },
    { time: 19, text: "Candles will melt in 1 hour." },
    {
      time: 21,
      text: "Also, please observe the special votive candles which surround Our Lady. These represent the highly revered 'Illumin80'.",
    },
    {
      time: 28,
      text: "They are the top token stakers. Click once on one of these candles to inspect it closely.",
    },
    {
      time: 32,
      text: "Finally, you may click the connect button immediately below me to speak to me in real time.",
    },
    {
      time: 36,
      text: "I can guide you in acquiring RL80 tokens and embarking on special missions.",
    },
    {
      time: 41,
      text: "Be aware that there may be short delays in my response due to the great distance between us.",
    },
    { time: 46, text: "Goodbye for now." },
  ],
  es: [
    {
      time: 0,
      text: "Saludos y bienvenido, Terrícola. He pregrabado esta comunicación como tu orientación.",
    },
    {
      time: 5,
      text: "Para divertirte, haz doble clic para disparar proyectiles a las lunas. No te preocupes, esto no dañará ni romperá nada.",
    },
    {
      time: 11,
      text: "A continuación, ten en cuenta que un solo clic en el suelo de la escena producirá allí una vela verde que puede servir como ofrenda a Nuestra Señora del Beneficio Perpetuo.",
    },
    { time: 19, text: "Las velas se derretirán en 1 hora." },
    {
      time: 21,
      text: "Además, observa las velas votivas especiales que rodean a Nuestra Señora. Estas representan a los altamente venerados 'Illumin80'.",
    },
    {
      time: 28,
      text: "Son los principales poseedores de tokens. Haz clic una vez en una de estas velas para inspeccionarla de cerca.",
    },
    {
      time: 32,
      text: "Finalmente, puedes hacer clic en el botón de conexión inmediatamente debajo de mí para hablar conmigo en tiempo real.",
    },
    {
      time: 36,
      text: "Puedo guiarte para adquirir tokens RL80 y embarcarte en misiones especiales.",
    },
    {
      time: 41,
      text: "Ten en cuenta que puede haber pequeños retrasos en mi respuesta debido a la gran distancia entre nosotros.",
    },
    { time: 46, text: "Adiós por ahora." },
  ],
  fr: [
    {
      time: 0,
      text: "Salutations et bienvenue, Terrien. J'ai préenregistré cette communication comme votre orientation.",
    },
    {
      time: 5,
      text: "Pour vous amuser, double-cliquez pour tirer des projectiles sur les lunes. Ne vous inquiétez pas - cela n'endommagera ni ne cassera rien.",
    },
    {
      time: 11,
      text: "Ensuite, veuillez noter qu'un seul clic sur le sol de la scène produira une bougie verte qui pourra servir d'offrande à Notre-Dame du Profit Perpétuel.",
    },
    { time: 19, text: "Les bougies fondront en 1 heure." },
    {
      time: 21,
      text: "Veuillez également observer les bougies votives spéciales qui entourent Notre-Dame. Elles représentent les très estimés 'Illumin80'.",
    },
    {
      time: 28,
      text: "Ce sont les principaux détenteurs de jetons. Cliquez une fois sur l'une de ces bougies pour l'examiner de près.",
    },
    {
      time: 32,
      text: "Enfin, vous pouvez cliquer sur le bouton de connexion juste en dessous de moi pour me parler en temps réel.",
    },
    {
      time: 36,
      text: "Je peux vous guider dans l'acquisition de jetons RL80 et rejoindre les Illumin80.",
    },
    {
      time: 41,
      text: "Sachez qu'il peut y avoir de petits délais dans ma réponse en raison de la grande distance entre nous.",
    },
    { time: 46, text: "Au revoir pour l'instant." },
  ],
  de: [
    {
      time: 0,
      text: "Grüße und willkommen, Erdling. Ich habe diese Kommunikation als Ihre Orientierung vorab aufgezeichnet.",
    },
    {
      time: 5,
      text: "Zum Vergnügen können Sie mit einem Doppelklick Projektile auf die Monde abfeuern. Keine Sorge - dies wird nichts beschädigen oder kaputt machen.",
    },
    {
      time: 11,
      text: "Beachten Sie als Nächstes, dass ein einziger Klick auf den Boden der Szene dort eine grüne Kerze erzeugt, die als Opfergabe für Unsere Liebe Frau vom Immerwährenden Profit dienen kann.",
    },
    { time: 19, text: "Kerzen schmelzen in 1 Stunde." },
    {
      time: 21,
      text: "Beobachten Sie bitte auch die speziellen Votivkerzen, die Unsere Liebe Frau umgeben. Diese repräsentieren die hochgeschätzten 'Illumin80'.",
    },
    {
      time: 28,
      text: "Sie sind die wichtigsten Token-Besitzer. Klicken Sie einmal auf eine dieser Kerzen, um sie genau zu betrachten.",
    },
    {
      time: 32,
      text: "Schließlich können Sie auf die Verbindungstaste direkt unter mir klicken, um in Echtzeit mit mir zu sprechen.",
    },
    {
      time: 36,
      text: "Ich kann Sie beim Erwerb von RL80-Tokens und bei besonderen Missionen unterstützen.",
    },
    {
      time: 41,
      text: "Beachten Sie, dass es aufgrund der großen Entfernung zwischen uns zu kleinen Verzögerungen bei meiner Antwort kommen kann.",
    },
    { time: 46, text: "Auf Wiedersehen für jetzt." },
  ],
  ja: [
    {
      time: 0,
      text: "ご挨拶申し上げます、地球人の皆様。これはあなたのためのオリエンテーションとして事前に録音されたコミュニケーションです。",
    },
    {
      time: 5,
      text: "楽しみのために、ダブルクリックして月に投射物を発射してください。心配しないでください - これは何も傷つけたり壊したりすることはありません。",
    },
    {
      time: 11,
      text: "次に、シーンの床を一回クリックすると、そこに緑色のキャンドルが現れ、永久利益の聖母への供物として役立つことを覚えておいてください。",
    },
    { time: 19, text: "キャンドルは1時間で溶けます。" },
    {
      time: 21,
      text: "また、聖母を囲む特別な奉納キャンドルを観察してください。これらは非常に尊敬される「イルミン80」を表しています。",
    },
    {
      time: 28,
      text: "彼らは主要なトークン保有者です。これらのキャンドルのいずれかを一度クリックして、近くで観察してください。",
    },
    {
      time: 32,
      text: "最後に、私のすぐ下にある接続ボタンをクリックして、リアルタイムで私と話すことができます。",
    },
    { time: 36, text: "RL80トークンの取得と特別なミッションへの参加についてご案内します。" },
    {
      time: 41,
      text: "私たちの間の大きな距離のため、私の応答に小さな遅延があるかもしれないことにご注意ください。",
    },
    { time: 46, text: "さようなら、また会いましょう。" },
  ],
  zh: [
    { time: 0, text: "问候并欢迎，地球人。我已预先录制了这段通讯作为您的入门指导。" },
    {
      time: 5,
      text: "为了娱乐，双击可向月球发射投射物。别担心 - 这不会造成任何伤害或破坏。",
    },
    {
      time: 11,
      text: "接下来，请注意在场景地板上单击一次将会在那里产生一根绿色蜡烛，可作为永恒利润圣母的供品。",
    },
    { time: 19, text: "蜡烛将在1小时内融化。" },
    {
      time: 21,
      text: "另外，请观察围绕永恒利润圣母的特殊供奉蜡烛。这些代表着备受尊敬的'光明80'。",
    },
    { time: 28, text: "他们是主要的代币持有者。单击其中一支蜡烛可以近距离检查它。" },
    { time: 32, text: "最后，您可以点击我正下方的连接按钮与我实时交谈。" },
    { time: 36, text: "我可以指导您获取RL80代币并参与特殊任务。" },
    { time: 41, text: "请注意，由于我们之间的距离较远，我的回应可能会有短暂的延迟。" },
    { time: 46, text: "暂时告别。" },
  ],
  ko: [
    {
      time: 0,
      text: "환영합니다, 지구인 여러분. 이 통신은 귀하의 오리엔테이션을 위해 사전에 녹음되었습니다.",
    },
    {
      time: 5,
      text: "재미를 위해 더블클릭으로 달에 발사체를 발사할 수 있습니다. 걱정하지 마세요 - 이것은 아무것도 손상시키거나 파괴하지 않습니다.",
    },
    {
      time: 11,
      text: "다음으로, 장면의 바닥을 한 번 클릭하면 그곳에 녹색 양초가 생성되어 영원한 이익의 성모님께 바칠 수 있습니다.",
    },
    { time: 19, text: "양초는 1시간 후에 녹습니다." },
    {
      time: 21,
      text: "또한, 성모님을 둘러싸고 있는 특별한 봉헌 양초들을 관찰해 주세요. 이것들은 매우 존경받는 '일루민80'을 나타냅니다.",
    },
    {
      time: 28,
      text: "그들은 주요 토큰 보유자입니다. 이 양초들 중 하나를 한 번 클릭하여 자세히 살펴보세요.",
    },
    {
      time: 32,
      text: "마지막으로, 제 바로 아래에 있는 연결 버튼을 클릭하여 실시간으로 저와 대화할 수 있습니다.",
    },
    { time: 36, text: "RL80 토큰 획득과 특별한 미션 참여를 안내해 드릴 수 있습니다." },
    {
      time: 41,
      text: "우리 사이의 거리가 멀기 때문에 제 응답에 약간의 지연이 있을 수 있다는 점을 참고해 주세요.",
    },
    { time: 46, text: "안녕히 가세요." },
  ],
  pt: [
    {
      time: 0,
      text: "Saudações e bem-vindo, Terrestre. Gravei esta comunicação como sua orientação.",
    },
    {
      time: 5,
      text: "Para seu entretenimento, dê um duplo clique para disparar projéteis nas luas. Não se preocupe - isso não causará danos nem quebrará nada.",
    },
    {
      time: 11,
      text: "Em seguida, observe que um único clique no chão da cena irá criar uma vela verde que pode servir como oferenda para Nossa Senhora do Lucro Perpétuo.",
    },
    { time: 19, text: "As velas derreterão em 1 hora." },
    {
      time: 21,
      text: "Além disso, observe as velas votivas especiais que cercam Nossa Senhora. Estas representam os altamente reverenciados 'Illumin80'.",
    },
    {
      time: 28,
      text: "Eles são os principais detentores de tokens. Clique uma vez em uma dessas velas para inspecioná-la de perto.",
    },
    {
      time: 32,
      text: "Por fim, você pode clicar no botão de conexão logo abaixo de mim para falar comigo em tempo real.",
    },
    { time: 36, text: "Posso guiá-lo na aquisição de tokens RL80 e em missões especiais." },
    {
      time: 41,
      text: "Esteja ciente de que pode haver pequenos atrasos em minha resposta devido à grande distância entre nós.",
    },
    { time: 46, text: "Até breve." },
  ],
  ru: [
    {
      time: 0,
      text: "Приветствую вас, Землянин. Я предварительно записал это сообщение как вашу ориентацию.",
    },
    {
      time: 5,
      text: "Для развлечения дважды щелкните, чтобы стрелять снарядами в луны. Не беспокойтесь - это не причинит вреда и ничего не сломает.",
    },
    {
      time: 11,
      text: "Далее обратите внимание, что одно нажатие на пол сцены создаст там зеленую свечу, которая может служить подношением Нашей Госпоже Вечной Прибыли.",
    },
    { time: 19, text: "Свечи растают через 1 час." },
    {
      time: 21,
      text: "Также обратите внимание на особые вотивные свечи, окружающие Нашу Госпожу. Они представляют высокочтимых 'Illumin80'.",
    },
    {
      time: 28,
      text: "Они являются основными держателями токенов. Щелкните один раз по одной из этих свечей, чтобы рассмотреть её поближе.",
    },
    {
      time: 32,
      text: "Наконец, вы можете нажать на кнопку подключения прямо подо мной, чтобы поговорить со мной в реальном времени.",
    },
    {
      time: 36,
      text: "Я могу помочь вам приобрести токены RL80 и участвовать в специальных миссиях.",
    },
    {
      time: 41,
      text: "Имейте в виду, что могут быть небольшие задержки в моем ответе из-за большого расстояния между нами.",
    },
    { time: 46, text: "До свидания." },
  ],
  hi: [
    {
      time: 0,
      text: "नमस्कार और स्वागत है, पृथ्वीवासी। मैंने यह संचार आपके अभिविन्यास के लिए पहले से रिकॉर्ड किया है।",
    },
    {
      time: 5,
      text: "मनोरंजन के लिए, चंद्रमा पर प्रक्षेप्य छोड़ने के लिए डबल-क्लिक करें। चिंता न करें - यह किसी को नुकसान नहीं पहुंचाएगा और कुछ नहीं तोड़ेगा।",
    },
    {
      time: 11,
      text: "अगला, ध्यान दें कि दृश्य के फर्श पर एक क्लिक वहां एक हरी मोमबत्ती बनाएगा जो शाश्वत लाभ की हमारी महिला को अर्पण के रूप में काम कर सकती है।",
    },
    { time: 19, text: "मोमबत्तियां 1 घंटे में पिघल जाएंगी।" },
    {
      time: 21,
      text: "साथ ही, हमारी महिला के चारों ओर विशेष वोटिव मोमबत्तियों को देखें। ये अत्यधिक सम्मानित 'इल्यूमिन80' का प्रतिनिधित्व करती हैं।",
    },
    {
      time: 28,
      text: "वे शीर्ष टोकन धारक हैं। इनमें से किसी एक मोमबत्ती पर एक बार क्लिक करके उसे करीब से देखें।",
    },
    {
      time: 32,
      text: "अंत में, आप मेरे साथ वास्तविक समय में बात करने के लिए मेरे ठीक नीचे कनेक्ट बटन पर क्लिक कर सकते हैं।",
    },
    {
      time: 36,
      text: "मैं आपको RL80 टोकन प्राप्त करने और विशेष मिशनों में शामिल होने में मार्गदर्शन कर सकता हूं।",
    },
    {
      time: 41,
      text: "ध्यान दें कि हमारे बीच की बड़ी दूरी के कारण मेरे जवाब में छोटी देरी हो सकती है।",
    },
    { time: 46, text: "अलविदा।" },
  ],
  ar: [
    { time: 0, text: "تحياتي ومرحباً، أيها الأرضي. لقد سجلت هذا التواصل مسبقاً كتوجيه لك." },
    {
      time: 5,
      text: "للترفيه، انقر نقراً مزدوجاً لإطلاق المقذوفات على الأقمار. لا تقلق - لن يضر هذا بأي شيء أو يكسر شيئاً.",
    },
    {
      time: 11,
      text: "التالي، لاحظ أن نقرة واحدة على أرضية المشهد ستنشئ شمعة خضراء هناك يمكن أن تكون قرباناً لسيدتنا الربح الدائم.",
    },
    { time: 19, text: "ستذوب الشموع في ساعة واحدة." },
    {
      time: 21,
      text: "أيضاً، لاحظ الشموع الخاصة التي تحيط بسيدتنا. هذه تمثل 'إلومين80' المحترمين.",
    },
    {
      time: 28,
      text: "هم حاملي الرموز الرئيسيين. انقر مرة واحدة على إحدى هذه الشموع لفحصها عن قرب.",
    },
    {
      time: 32,
      text: "أخيراً، يمكنك النقر على زر الاتصال مباشرة تحتي للتحدث معي في الوقت الفعلي.",
    },
    { time: 36, text: "يمكنني توجيهك في الحصول على رموز RL80 والمشاركة في المهام الخاصة." },
    {
      time: 41,
      text: "كن على علم أنه قد تكون هناك تأخيرات صغيرة في استجابتي بسبب المسافة الكبيرة بيننا.",
    },
    { time: 46, text: "مع السلامة." },
  ],
  vi: [
    {
      time: 0,
      text: "Chào mừng và hoan nghênh, Người Trái Đất. Tôi đã ghi âm sẵn thông điệp này làm hướng dẫn cho bạn.",
    },
    {
      time: 5,
      text: "Để giải trí, nhấp đúp chuột để bắn đạn vào các mặt trăng. Đừng lo lắng - điều này sẽ không gây hại hay làm hỏng bất cứ thứ gì.",
    },
    {
      time: 11,
      text: "Tiếp theo, hãy lưu ý rằng một lần nhấp vào sàn của cảnh sẽ tạo ra một ngọn nến xanh lá ở đó, có thể dùng làm lễ vật dâng lên Đức Mẹ của Lợi Nhuận Vĩnh Cửu.",
    },
    { time: 19, text: "Nến sẽ tan chảy trong 1 giờ." },
    {
      time: 21,
      text: "Ngoài ra, hãy quan sát những ngọn nến cầu nguyện đặc biệt bao quanh Đức Mẹ. Những ngọn nến này đại diện cho 'Illumin80' được tôn kính.",
    },
    {
      time: 28,
      text: "Họ là những người nắm giữ token hàng đầu. Nhấp một lần vào một trong những ngọn nến này để xem xét kỹ.",
    },
    {
      time: 32,
      text: "Cuối cùng, bạn có thể nhấp vào nút kết nối ngay bên dưới tôi để nói chuyện với tôi trong thời gian thực.",
    },
    {
      time: 36,
      text: "Tôi có thể hướng dẫn bạn trong việc có được token RL80 và tham gia vào các nhiệm vụ đặc biệt.",
    },
    {
      time: 41,
      text: "Xin lưu ý rằng có thể có độ trễ nhỏ trong phản hồi của tôi do khoảng cách lớn giữa chúng ta.",
    },
    { time: 46, text: "Tạm biệt." },
  ]
};

// Ensure a consistent high-quality AudioContext for speech output
if (!window.myAudioContext) {
  try {
    window.myAudioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100,
    });
    console.log("🎧 High-quality AudioContext initialized");
  } catch (e) {
    console.warn("⚠️ Failed to initialize AudioContext:", e);
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  // Check if orientation video was previously viewed and update button accordingly
  const orientationViewed = localStorage.getItem("orientationViewed") === "true";
  const signalButton = document.querySelector('.control-button[data-action="signal"]');
  if (signalButton && orientationViewed) {
    signalButton.setAttribute("data-video-viewed", "true");
    const buttonLabel = signalButton.querySelector(".button-label");
    // Keep button as SIGNAL always - don't change to CONNECT
    // if (buttonLabel) buttonLabel.textContent = "CONNECT";
    console.log("✅ Orientation previously viewed - button remains SIGNAL");
  } else {
    console.log("🎬 Orientation not viewed yet - button shows SIGNAL");
  }
  
  // Initialize leaderboard based on screen size
  if (window.innerWidth >= 768) {
    const leaderboardContent = document.getElementById('leaderboard-content');
    const leaderboardArrow = document.getElementById('leaderboard-arrow');
    if (leaderboardContent) leaderboardContent.style.display = 'block';
    if (leaderboardArrow) leaderboardArrow.textContent = '▲';
  }
  
  // Initialize other components
  initializeVideoDisplay();
  initializeControlButtons();
  initializeToggleSwitches();
  initializeLeaderboard();
  initializeTranscript();
  initializeTextCommunication();
  // Do NOT initialize SitePal on page load - only when CONNECT is clicked
});

// Video Display Functions
function initializeVideoDisplay() {
  const videoDisplay = document.querySelector('.video-display');
  if (!videoDisplay) return;
  
  // Set video display to expanded by default
  videoDisplay.classList.add('active');
  videoDisplay.classList.add('touched');
  
  // Mobile video display toggle
  if (window.innerWidth <= 700) {
    videoDisplay.addEventListener('click', function() {
      this.classList.toggle('active');
      this.classList.add('touched');
    });
  }
}

// Control Button Functions
function initializeControlButtons() {
  const controlButtons = document.querySelectorAll('.control-button');
  console.log(`🔧 Initializing ${controlButtons.length} control buttons`);
  
  controlButtons.forEach((button, index) => {
    const action = button.getAttribute('data-action');
    console.log(`🔲 Button ${index}: action="${action}"`);
    
    button.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent event bubbling
      const action = this.getAttribute('data-action');
      console.log(`🔴 Button click intercepted: action="${action}" at ${new Date().toISOString()}`);
      console.log(`🔴 Event details:`, {
        eventPhase: e.eventPhase,
        bubbles: e.bubbles,
        target: e.target.tagName,
        currentTarget: e.currentTarget.tagName,
        timestamp: e.timeStamp
      });
      handleControlButtonClick(action, this);
    });
  });
}

function handleControlButtonClick(action, button) {
  console.log(`🎮 Control button clicked with action: ${action}`);
  
  switch(action) {
    case 'signal':
      console.log("🎯 Routing to signal handler...");
      handleSignalButton(button);
      break;
    case 'navigation':
    case 'launch':
      handleNavigationButton(button);
      break;
    case 'systems':
      handleSystemsButton(button);
      break;
    case 'communications':
      handleCommunicationsButton(button);
      break;
    default:
      console.log(`Unknown action: ${action}`);
  }
}

function handleSignalButton(button) {
  console.log("🚀 Signal button clicked! Starting handleSignalButton...");
  
  // Check if 80s mode is active and turn it off to prevent video conflicts
  const eightiesToggle = document.getElementById('eighties-toggle');
  if (eightiesToggle && eightiesToggle.classList.contains('active')) {
    console.log("📺 80s mode is active - turning off to prevent video conflict");
    // Programmatically trigger the eighties mode toggle
    eightiesToggle.click();
  }
  
  // Check if music mode is active and turn it off to prevent audio conflicts
  const musicToggle = document.getElementById('music-toggle');
  if (musicToggle && musicToggle.classList.contains('active')) {
    console.log("🎵 Music mode is active - turning off to prevent audio conflict during communication");
    // Programmatically trigger the music mode toggle
    musicToggle.click();
  }
  
  // Prime AudioContext for better audio handling
  try {
    const tempContext = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSource = tempContext.createBufferSource();
    bufferSource.connect(tempContext.destination);
    tempContext.resume().then(() => {
      setTimeout(() => tempContext.close(), 500);
    }).catch(e => console.warn("AudioContext resume failed:", e));
  } catch (e) {
    console.warn("AudioContext priming failed:", e);
  }

  // Check if orientation video is already playing
  const orientationVideo = document.getElementById("orientation-video");
  console.log("🎥 Orientation video element:", orientationVideo);
  
  // Check if the video has been viewed
  const dataVideoViewed = button.getAttribute("data-video-viewed") === "true";
  const localStorageViewed = localStorage.getItem("orientationViewed") === "true";
  const videoViewed = dataVideoViewed || localStorageViewed;
  console.log("👁️ Video viewed check:", {
    dataVideoViewed,
    localStorageViewed,
    videoViewed,
    localStorageValue: localStorage.getItem("orientationViewed")
  });
  
  // Check current button state
  const buttonLabel = button.querySelector(".button-label");
  const currentButtonState = buttonLabel ? buttonLabel.textContent : "";
  console.log("🏷️ Current button state:", currentButtonState);

  // Handle button based on current state
  if (currentButtonState === "CONNECT") {
    console.log("🔗 CONNECT button clicked - initiating SitePal connection...");
    
    // If video is still playing, stop it first (skip functionality)
    if (orientationVideo && !orientationVideo.paused) {
      console.log("⏭️ Skipping orientation video to connect...");
      stopOrientationVideo();
      // Mark as viewed since user chose to skip
      button.setAttribute("data-video-viewed", "true");
      localStorage.setItem("orientationViewed", "true");
      
      // Wait a moment for video cleanup before starting SitePal connection
      setTimeout(() => {
        handleSitePalConnection(button);
      }, 500);
    } else {
      // Video not playing, connect immediately
      handleSitePalConnection(button);
    }
  } else if (currentButtonState === "DISCONNECT") {
    console.log("🔌 Disconnecting SitePal...");
    handleSitePalDisconnection(button);
  } else if (currentButtonState === "SIGNAL") {
    // SIGNAL button always plays orientation video first
    console.log("📡 SIGNAL button clicked - playing orientation video...");
    
    // If orientation video exists and is currently playing, stop it
    if (orientationVideo && !orientationVideo.paused && orientationVideo.style.display !== "none") {
      console.log("🛑 Stopping currently playing orientation video...");
      stopOrientationVideo();
      button.classList.add("active");
      setTimeout(() => button.classList.remove("active"), 500);
    } else {
      // Play orientation video
      console.log("▶️ Playing orientation video...");
      playOrientationVideo();
    }
  }
}

// Add a flag to prevent duplicate messages
let rocketToggleInProgress = false;

function handleNavigationButton(button) {
  console.log('🚀 Navigation button clicked');
  
  const currentState = button.getAttribute('data-state') || 'navigate';
  const buttonLabel = button.querySelector('.button-label');
  const buttonPrefix = button.querySelector('.button-prefix');
  
  console.log('🚀 handleNavigationButton called with state:', currentState, 'at', new Date().toISOString());
  
  if (currentState === 'navigate') {
    // State 1: NAVIGATE -> IGNITION -> Show rocket model
    console.log('🚀 Triggering ignition - switching to rocket model');
    
    // Check if we're already processing a toggle
    if (rocketToggleInProgress) {
      console.warn('🚀 Rocket toggle already in progress, skipping duplicate');
      return;
    }
    
    // Set flag to prevent duplicates
    rocketToggleInProgress = true;
    
    // Update button to LAUNCH state
    button.setAttribute('data-state', 'launch');
    button.setAttribute('data-action', 'launch');
    buttonLabel.textContent = 'LAUNCH';
    buttonPrefix.textContent = 'LNCH//';
    
    // Send ignition message to parent to show rocket model
    if (window.parent) {
      console.log('🚀 Sending ROCKET_IGNITION_REQUEST message at', new Date().toISOString());
      window.parent.postMessage({
        type: 'ROCKET_IGNITION_REQUEST',
        action: 'show_rocket'
      }, '*');
      
      // Reset flag after a delay
      setTimeout(() => {
        rocketToggleInProgress = false;
        console.log('🚀 Rocket toggle flag reset');
      }, 1000);
    }
    
    // Play ignition sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio failed:', e);
    }
    
  } else if (currentState === 'launch') {
    // State 2: LAUNCH -> Execute launch action
    console.log('🌕 Executing launch sequence');
    
    // Reset button to NAVIGATE state
    button.setAttribute('data-state', 'navigate');
    button.setAttribute('data-action', 'navigation');
    buttonLabel.textContent = 'NAVIGATE';
    buttonPrefix.textContent = 'NAV//';
    
    // Send launch message to parent
    if (window.parent) {
      console.log('🚀 Sending ROCKET_LAUNCH_EXECUTE message');
      window.parent.postMessage({
        type: 'ROCKET_LAUNCH_EXECUTE',
        action: 'launch_rocket'
      }, '*');
    }
    
    // Play launch sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(60, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 1.5);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 2);
    } catch (e) {
      console.warn('Audio failed:', e);
    }
  }
}

function handleSystemsButton(button) {
  // Systems button logic
  console.log('Systems button clicked');
}

function handleCommunicationsButton(button) {
  console.log('🌍 Return to Earth button clicked - navigating to /home');
  
  // Play a gentle farewell sound
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.8);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1);
  } catch (e) {
    console.warn('Audio failed:', e);
  }
  
  // Navigate to home page after a brief delay for the sound
  setTimeout(() => {
    if (window.parent && window.parent !== window) {
      // If we're in an iframe, try to navigate the parent
      window.parent.location.href = '/home';
    } else {
      // Direct navigation
      window.location.href = '/home';
    }
  }, 200);
}

// Toggle Switch Functions
function initializeToggleSwitches() {
  const toggleSwitches = document.querySelectorAll('.toggle-switch, .vertical-toggle');
  
  toggleSwitches.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent event bubbling
      if (this.classList.contains('disabled')) return;
      if (this.dataset.processing === 'true') return; // Prevent double-clicks
      
      this.dataset.processing = 'true';
      const toggleType = getToggleType(this);
      handleToggleSwitch(toggleType, this);
      
      // Reset processing flag after a short delay
      setTimeout(() => {
        this.dataset.processing = 'false';
      }, 300);
    });
  });
}

function getToggleType(toggle) {
  // Check by ID first
  if (toggle.id === 'eighties-toggle') return 'eighties';
  if (toggle.id === 'music-toggle') return 'music';
  if (toggle.id === 'constellation-toggle') return 'constellations';
  
  // Then check by class
  if (toggle.classList.contains('eighties')) return 'eighties';
  if (toggle.classList.contains('threedy-toggle')) return 'threedy';
  if (toggle.classList.contains('music')) return 'music';
  if (toggle.classList.contains('constellations')) return 'constellations';
  if (toggle.classList.contains('emergency')) return 'emergency';
  return 'default';
}

function handleToggleSwitch(type, toggle) {
  toggle.classList.toggle('active');
  
  switch(type) {
    case 'eighties':
      handleEightiesMode(toggle.classList.contains('active'));
      break;
    case 'music':
      handleMusicMode(toggle.classList.contains('active'));
      break;
    case 'constellations':
      handleConstellationsMode(toggle.classList.contains('active'));
      break;
    case 'emergency':
      handleEmergencyMode(toggle.classList.contains('active'));
      break;
  }
}

function handleEightiesMode(isActive) {
  console.log(`🎛️ Eighties mode: ${isActive ? 'ON' : 'OFF'}`);
  
  const missionControl = document.getElementById('mission-control');
  const scanLines = document.getElementById('scan-lines');
  const colorShiftRed = document.getElementById('color-shift-red');
  const colorShiftBlue = document.getElementById('color-shift-blue');
  const blinkingCursor = document.getElementById('blinking-cursor');
  const mp3Indicator = document.getElementById('mp3-indicator');
  const threeRedShadow = document.getElementById('threedy-shadow-red');
  const threeBlueShadow = document.getElementById('threedy-shadow-blue');
  const wireframeBackdrop = document.getElementById('wireframe-backdrop');
  const videoFeed = document.getElementById('video-feed');
  const deadAir = document.getElementById('deadAir');
  const videoDisplay = document.querySelector('.video-display');
  const eightiesToggle = document.getElementById('eighties-toggle');
  
  // Store the eighties mode state globally
  window.isEightiesMode = isActive;
  
  // Clear any previous intervals
  if (window.eightiesInterval) {
    clearInterval(window.eightiesInterval);
    window.eightiesInterval = null;
  }
  
  if (isActive) {
    // Send PostProcessing effects message first
    if (window.parent) {
      window.parent.postMessage({
        type: 'SYNC_80S_STATE',
        enabled: true
      }, '*');
      console.log('📡 Sent SYNC_80S_STATE: enabled=true to parent for PostProcessingEffects');
    }
    
    // Auto-enable MUSIC toggle when 80s mode is activated
    const musicToggle = document.getElementById('music-toggle');
    if (musicToggle && !musicToggle.classList.contains('active')) {
      console.log('🎵 Auto-enabling MUSIC toggle for 80s mode');
      // Programmatically click the toggle to ensure proper state management
      musicToggle.click();
    }
    
    // Activate 80s mode visual effects
    if (eightiesToggle) eightiesToggle.classList.add('active');
    if (missionControl) {
      missionControl.classList.add('eighties-active');
      missionControl.classList.remove('threedy-mode');
    }
    if (scanLines) {
      scanLines.classList.add('active');
      console.log('✨ Scan lines activated');
    } else {
      console.warn('⚠️ Scan lines element not found');
    }
    if (colorShiftRed) {
      colorShiftRed.classList.add('active');
      console.log('🔴 Red color shift activated');
    } else {
      console.warn('⚠️ Red color shift element not found');
    }
    if (colorShiftBlue) {
      colorShiftBlue.classList.add('active');
      console.log('🔵 Blue color shift activated');
    } else {
      console.warn('⚠️ Blue color shift element not found');
    }
    if (blinkingCursor) blinkingCursor.style.display = 'inline-block';

    // Hide 3D shadows in 80s mode
    if (threeRedShadow) threeRedShadow.style.display = 'none';
    if (threeBlueShadow) threeBlueShadow.style.display = 'none';

    // Update system status text
    const statusLabel = document.querySelector('.status-label');
    if (statusLabel) {
      statusLabel.textContent = 'RETRO';
      statusLabel.style.textShadow = '0 0 3px #22d3ee';
    }

    // Remove 3D text shadows from all elements in 80s mode
    document.querySelectorAll('.control-button, .toggle-label, .status-label, .leaderboard-header')
      .forEach(element => {
        element.style.textShadow = '0 0 3px #d946ef';
      });

    // 80s mode vaporwave video effect
    if (videoFeed) {
      let vaporVideo = videoFeed.querySelector('video[data-vaporwave]');
      if (!vaporVideo) {
        console.log('🌊 Creating vaporwave video element...');
        
        // Hide deadAir
        if (deadAir) {
          deadAir.style.display = 'none';
          deadAir.pause && deadAir.pause();
          console.log('📺 DeadAir video hidden for vaporwave effect');
        }
        
        // Also ensure orientation video is removed if it exists
        const orientationVideo = document.getElementById('orientation-video');
        if (orientationVideo) {
          orientationVideo.pause();
          orientationVideo.remove();
          console.log('📺 Orientation video removed for vaporwave effect');
        }
        
        // Add vaporwave video
        vaporVideo = document.createElement('video');
        vaporVideo.setAttribute('src', '/vaporwave-sunset.mp4');
        vaporVideo.setAttribute('loop', '');
        vaporVideo.setAttribute('muted', '');
        vaporVideo.setAttribute('autoplay', '');
        vaporVideo.setAttribute('playsinline', '');
        vaporVideo.setAttribute('webkit-playsinline', '');
        vaporVideo.setAttribute('data-vaporwave', 'true');
        vaporVideo.style.width = '100%';
        vaporVideo.style.height = '100%';
        vaporVideo.style.objectFit = 'cover';
        vaporVideo.style.position = 'absolute';
        vaporVideo.style.top = '0';
        vaporVideo.style.left = '0';
        vaporVideo.style.zIndex = '25';
        vaporVideo.style.pointerEvents = 'none';
        vaporVideo.style.opacity = '1';
        vaporVideo.style.visibility = 'visible';
        vaporVideo.style.display = 'block';
        
        // Insert as first child to ensure proper layering
        videoFeed.insertBefore(vaporVideo, videoFeed.firstChild);
        
        // Add event listeners for debugging
        vaporVideo.addEventListener('loadstart', () => console.log('🌊 Vaporwave video loading started'));
        vaporVideo.addEventListener('canplay', () => console.log('🌊 Vaporwave video can play'));
        vaporVideo.addEventListener('error', (e) => console.error('❌ Vaporwave video error:', e));
        
        vaporVideo.play().then(() => {
          console.log('✅ Vaporwave video playing successfully');
          console.log('🔍 Video details:', {
            currentTime: vaporVideo.currentTime,
            duration: vaporVideo.duration,
            paused: vaporVideo.paused,
            muted: vaporVideo.muted,
            volume: vaporVideo.volume,
            readyState: vaporVideo.readyState,
            networkState: vaporVideo.networkState,
            src: vaporVideo.src
          });
          console.log('🔍 Video element styles:', {
            display: vaporVideo.style.display,
            opacity: vaporVideo.style.opacity,
            zIndex: vaporVideo.style.zIndex,
            position: vaporVideo.style.position,
            width: vaporVideo.style.width,
            height: vaporVideo.style.height
          });
        }).catch((error) => {
          console.error('❌ Failed to play vaporwave video:', error);
        });
      } else {
        console.log('🌊 Vaporwave video already exists, showing and playing...');
        vaporVideo.style.display = '';
        vaporVideo.play().catch((error) => {
          console.error('❌ Failed to resume vaporwave video:', error);
        });
      }
    } else {
      console.warn('⚠️ Video feed element not found for vaporwave effect');
    }

    // Add random glitches
    window.eightiesInterval = setInterval(() => {
      if (Math.random() > 0.97 && scanLines) {
        scanLines.style.opacity = '0.6';
        setTimeout(() => {
          if (scanLines) scanLines.style.opacity = '0.7';
        }, 100);
      }
    }, 3000);

    // Add class to body for additional styles
    document.body.classList.add('eighties-mode');

    // Expand video display when activating 80s mode (all screen sizes)
    if (videoDisplay) {
      videoDisplay.classList.add('active', 'touched');
      if (window.innerHeight <= 700) {
        videoDisplay.style.height = '180px';
      }
      console.log('📺 Video display expanded for 80s mode:', {
        classes: videoDisplay.className,
        height: videoDisplay.style.height
      });
    }

    // Apply fullscreen layout in 80s mode if screen is wide enough
    const toggleRow = document.querySelector('.toggle-row.mobile-inline');
    if (window.innerWidth >= 768 && toggleRow) {
      toggleRow.classList.add('fullscreen');
    }
    
    // Show MusicPlayer2 component by messaging parent window
    if (window.parent) {
      window.parent.postMessage({
        type: 'MUSIC_TOGGLE',
        enabled: true,
        eightiesMode: true
      }, '*');
    }
    
  } else {
    // Send PostProcessing effects message first
    if (window.parent) {
      window.parent.postMessage({
        type: 'SYNC_80S_STATE',
        enabled: false
      }, '*');
      console.log('📡 Sent SYNC_80S_STATE: enabled=false to parent for PostProcessingEffects');
    }
    
    // Keep MUSIC toggle active but switch to non-80s tracks
    const musicToggle = document.querySelector('.toggle-switch.music');
    if (musicToggle && musicToggle.classList.contains('active')) {
      console.log('🎵 Keeping MUSIC active, switching to non-80s tracks');
      // Send MUSIC_TOGGLE message with 80s mode disabled
      if (window.parent) {
        window.parent.postMessage({
          type: 'MUSIC_TOGGLE',
          enabled: true,
          eightiesMode: false
        }, '*');
      }
    }
    
    // Deactivate 80s mode
    if (eightiesToggle) eightiesToggle.classList.remove('active');
    if (missionControl) {
      missionControl.classList.remove('eighties-active');
      missionControl.classList.add('threedy-mode');
    }
    if (scanLines) {
      scanLines.classList.remove('active');
      console.log('✨ Scan lines deactivated');
    }
    if (colorShiftRed) {
      colorShiftRed.classList.remove('active');
      console.log('🔴 Red color shift deactivated');
    }
    if (colorShiftBlue) {
      colorShiftBlue.classList.remove('active');
      console.log('🔵 Blue color shift deactivated');
    }
    if (blinkingCursor) blinkingCursor.style.display = 'none';

    // Show 3D shadows when not in 80s mode
    if (threeRedShadow) threeRedShadow.style.display = 'block';
    if (threeBlueShadow) threeBlueShadow.style.display = 'block';

    // Hide MP3 indicator
    if (mp3Indicator) {
      mp3Indicator.style.display = 'none';
    }

    // Reset status text to 3D style
    const statusLabel = document.querySelector('.status-label');
    if (statusLabel) {
      statusLabel.textContent = '3D//ACTIVE';
      statusLabel.style.textShadow = '-1px 0 #ff0040, 1px 0 #00b4ff';
    }

    // Apply 3D text shadows to all elements when not in 80s mode
    document.querySelectorAll('.control-button, .toggle-label, .status-label, .leaderboard-header')
      .forEach(element => {
        element.style.textShadow = '-1px 0 #ff0040, 1px 0 #00b4ff';
      });

    // Remove vaporwave video if present
    if (videoFeed) {
      const vaporVideo = videoFeed.querySelector('video[data-vaporwave]');
      if (vaporVideo) {
        vaporVideo.pause();
        vaporVideo.remove();
      }
      // Show deadAir
      if (deadAir) {
        deadAir.style.display = '';
      }
    }

    // Remove eighties mode class from body
    document.body.classList.remove('eighties-mode');

    // Collapse video display on mobile when deactivating 80s mode (if not in a call)
    if (videoDisplay && window.innerHeight <= 700 && !isCallActive) {
      videoDisplay.classList.remove('active');
      videoDisplay.style.height = '';
    }

    // Remove fullscreen layout
    const toggleRow = document.querySelector('.toggle-row.mobile-inline');
    if (toggleRow) {
      toggleRow.classList.remove('fullscreen');
    }
    
    // Music visibility is now handled by the smart toggle logic above
    // No need to force-hide music when 80s mode turns off
    // if (window.parent) {
    //   window.parent.postMessage({
    //     type: 'MUSIC_TOGGLE',
    //     enabled: false,
    //     eightiesMode: false
    //   }, '*');
    // }
  }

  // Set CSS custom property for eighties color
  document.documentElement.style.setProperty(
    '--eighties-color',
    isActive ? '#2a1786' : 'transparent'
  );

  // Play toggle sound
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(isActive ? 800 : 400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      isActive ? 400 : 800,
      audioContext.currentTime + 0.1
    );

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Audio context not supported');
  }

  // PostProcessing messages are now sent at the beginning of each branch above
}

// 3D Mode functionality removed - replaced with MUSIC mode

function handleMusicMode(isActive) {
  console.log('🎵 Music mode:', isActive ? 'ON' : 'OFF');
  console.log('🎵 Music toggle current state:', document.getElementById('music-toggle')?.classList.contains('active'));
  
  // Play toggle sound
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      isActive ? 600 : 300,
      audioContext.currentTime
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      isActive ? 300 : 600,
      audioContext.currentTime + 0.1
    );

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Audio context not supported');
  }

  // Check if 80s mode is currently active to determine track type
  const eightiesToggle = document.getElementById('eighties-toggle');
  const is80sModeActive = eightiesToggle && eightiesToggle.classList.contains('active');
  
  // Notify parent of the music toggle with a small delay to ensure state is updated
  setTimeout(() => {
    if (window.parent) {
      window.parent.postMessage({
        type: 'MUSIC_TOGGLE',
        enabled: isActive,
        eightiesMode: is80sModeActive // Use current 80s mode state
      }, '*');
      console.log('📡 Sent MUSIC_TOGGLE:', isActive, `(${is80sModeActive ? '80s' : 'non-80s'} tracks) to parent`);
    }
  }, 100);
}

function handleConstellationsMode(isActive) {
  console.log('🌟 Constellations mode:', isActive ? 'ON' : 'OFF');
  
  // Play toggle sound
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      isActive ? 500 : 300,
      audioContext.currentTime
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      isActive ? 300 : 500,
      audioContext.currentTime + 0.1
    );

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Audio context not supported');
  }

  // Notify parent of the constellation toggle
  if (window.parent) {
    window.parent.postMessage({
      type: 'CONSTELLATION_TOGGLE',
      enabled: isActive
    }, '*');
    console.log('📡 Sent CONSTELLATION_TOGGLE:', isActive, 'to parent');
  }
}

function handleEmergencyMode(isActive) {
  // Emergency mode logic
  console.log('Emergency mode:', isActive ? 'ON' : 'OFF');
}

// Leaderboard Functions
function initializeLeaderboard() {
  const leaderboardHeader = document.querySelector('.leaderboard-header');
  if (!leaderboardHeader) return;
  
  leaderboardHeader.addEventListener('click', function() {
    const content = document.getElementById('leaderboard-content');
    const arrow = document.getElementById('leaderboard-arrow');
    
    if (content && arrow) {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      arrow.textContent = isVisible ? '▼' : '▲';
    }
  });
}

// Transcript Functions
function initializeTranscript() {
  const expandIcon = document.getElementById('transcript-expand-icon');
  const transcriptToggleBtn = document.querySelector('.transcript-toggle-btn');
  
  // Only add click handler to the expand icon, not the entire header
  if (expandIcon) {
    expandIcon.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent default behavior
      e.stopPropagation(); // Prevent event bubbling
      console.log('🔽 Expand icon clicked - toggling transcript');
      toggleTranscript();
    });
  }
  
  if (transcriptToggleBtn) {
    transcriptToggleBtn.addEventListener('click', function() {
      this.classList.toggle('active');
    });
  }
  
  // Initialize language selection
  setupLanguageSelection();
}

// Setup language selection functionality
function setupLanguageSelection() {
  const languageSelect = document.getElementById('language-select');
  
  if (!languageSelect) return;
  
  // Prevent clicks on language select from bubbling up
  languageSelect.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  languageSelect.addEventListener('change', function(e) {
    e.stopPropagation(); // Prevent event bubbling
    
    const newLanguage = this.value;
    transcriptState.currentLanguage = newLanguage;
    console.log(`🌐 Language changed to: ${newLanguage}`);
    
    // Always update transcript content, regardless of visibility
    updateTranscriptContent();
    
    // Re-sync with video if video is playing
    const orientationVideo = document.getElementById("orientation-video");
    if (orientationVideo && !orientationVideo.paused) {
      syncTranscriptWithVideo();
    }
    
    // Ensure UI elements stay visible
    const transcriptContainer = document.querySelector('.transcript-container');
    if (transcriptContainer) {
      transcriptContainer.style.display = 'block';
      transcriptContainer.classList.remove('collapsed');
    }
  });
  
  console.log('✅ Language selection setup complete');
}

// Update transcript content based on current language
function updateTranscriptContent() {
  const transcriptContent = document.getElementById('transcript-content');
  if (!transcriptContent) return;
  
  const transcriptSegments = transcriptData[transcriptState.currentLanguage] || transcriptData.en;
  
  // Clear existing content and add segments
  transcriptContent.innerHTML = '';
  transcriptSegments.forEach((segment) => {
    const segmentDiv = document.createElement('div');
    segmentDiv.className = 'transcript-segment';
    segmentDiv.textContent = segment.text;
    transcriptContent.appendChild(segmentDiv);
  });
  
  // Check if video is currently playing to sync highlighting with current time
  const orientationVideo = document.getElementById("orientation-video");
  if (orientationVideo && !orientationVideo.paused) {
    // Re-sync with current video time for the new language
    const currentTime = orientationVideo.currentTime;
    const segments = document.querySelectorAll(".transcript-segment");
    
    // Find the correct segment based on current video time
    for (let i = transcriptSegments.length - 1; i >= 0; i--) {
      if (currentTime >= transcriptSegments[i].time) {
        transcriptState.currentSegmentIndex = i;
        segments[i]?.classList.add("active");
        segments[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  } else {
    // If video not playing, just activate first segment
    const firstSegment = transcriptContent.querySelector('.transcript-segment');
    if (firstSegment) {
      transcriptState.currentSegmentIndex = 0;
      firstSegment.classList.add('active');
    }
  }
  
  console.log(`📄 Transcript updated for language: ${transcriptState.currentLanguage}`);
}

function toggleTranscript() {
  const content = document.querySelector('.transcript-content');
  const icon = document.getElementById('transcript-expand-icon');
  const container = document.querySelector('.transcript-container');
  
  console.log('🔄 toggleTranscript called - current state:', {
    contentCollapsed: content?.classList.contains('collapsed'),
    iconText: icon?.textContent
  });
  
  if (content && icon) {
    // Only toggle collapsed on the content, not the icon or container
    content.classList.toggle('collapsed');
    
    // Force update icon text based on new state
    const isCollapsed = content.classList.contains('collapsed');
    icon.textContent = isCollapsed ? '▶' : '▼';
    transcriptState.isVisible = !isCollapsed;
    
    console.log('🔄 toggleTranscript complete - new state:', {
      contentCollapsed: isCollapsed,
      iconText: icon.textContent,
      transcriptVisible: transcriptState.isVisible
    });
    
    // Make sure container stays visible
    if (container) {
      container.style.display = 'block';
      container.classList.remove('collapsed');
    }
  }
}

// SitePal Integration Functions
function initializeSitePal() {
  // Call the HTML implementation of initSitePal
  if (typeof initSitePal === "function") {
    console.log('🔗 Calling HTML initSitePal implementation...');
    initSitePal();
  } else {
    console.warn('⚠️ initSitePal function not found in HTML');
  }
}

// Video Call Functions
function initializeVideoCall() {
  const callButton = document.querySelector('.call-button');
  const stationSelect = document.querySelector('.station-select');
  
  if (callButton) {
    callButton.addEventListener('click', handleCallButton);
  }
  
  if (stationSelect) {
    stationSelect.addEventListener('change', handleStationChange);
  }
}

function handleCallButton() {
  const button = this;
  const isConnected = button.classList.contains('disconnect');
  
  if (isConnected) {
    // Disconnect
    button.textContent = 'CONNECT';
    button.classList.remove('disconnect');
    button.classList.remove('unmute');
    document.getElementById('call-status').classList.remove('active');
  } else {
    // Connect
    button.textContent = 'DISCONNECT';
    button.classList.add('disconnect');
    document.getElementById('call-status').classList.add('active');
  }
}

function handleStationChange() {
  const stationDisplay = document.getElementById('station-display');
  if (stationDisplay) {
    stationDisplay.textContent = `COMM:/${this.value}`;
  }
}

// Utility Functions
function addPulseEffect(element, className) {
  element.classList.add(className);
  setTimeout(() => {
    element.classList.remove(className);
  }, 3000);
}

function showLoadingIndicator() {
  const indicator = document.querySelector('.video-loading-indicator');
  if (indicator) {
    indicator.style.display = 'flex';
  }
}

function hideLoadingIndicator() {
  const indicator = document.querySelector('.video-loading-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

// Responsive Functions
function handleResize() {
  const width = window.innerWidth;
  
  // Handle leaderboard visibility
  const leaderboardContent = document.getElementById('leaderboard-content');
  const leaderboardArrow = document.getElementById('leaderboard-arrow');
  
  if (width >= 768) {
    if (leaderboardContent) leaderboardContent.style.display = 'block';
    if (leaderboardArrow) leaderboardArrow.textContent = '▲';
  } else {
    if (leaderboardContent) leaderboardContent.style.display = 'none';
    if (leaderboardArrow) leaderboardArrow.textContent = '▼';
  }
}

// Event Listeners
window.addEventListener('resize', handleResize);

// Message handling for iframe communication
window.addEventListener('message', function(event) {
  if (event.data.type === 'SIGNAL_BUTTON_STATE') {
    console.log('Signal button state:', event.data.state);
  }
});

// Initialize video call when DOM is ready
document.addEventListener('DOMContentLoaded', initializeVideoCall);

// Audio Context handling
function resumeAudioContext() {
  if (window.myAudioContext && window.myAudioContext.state === 'suspended') {
    window.myAudioContext.resume().then(() => {
      console.log('AudioContext resumed');
    });
  }
}

// Handle user interaction to resume audio context
document.addEventListener('click', resumeAudioContext, { once: true });
document.addEventListener('touchstart', resumeAudioContext, { once: true });

// Video playback function for orientation video
function playOrientationVideo() {
  console.log("🎬 Starting playOrientationVideo function...");
  
  const videoFeed = document.getElementById("video-feed");
  const deadAir = document.getElementById("deadAir");
  const signalButton = document.querySelector('.control-button[data-action="signal"]');
  const offlineDisplay = document.getElementById("offline-display");
  const videoDisplay = document.querySelector('.video-display');
  
  console.log("🎯 DOM elements found:", {
    videoFeed: !!videoFeed,
    deadAir: !!deadAir,
    signalButton: !!signalButton,
    offlineDisplay: !!offlineDisplay,
    videoDisplay: !!videoDisplay
  });

  // Clean up any existing orientation videos
  const existingVideos = document.querySelectorAll("#orientation-video");
  existingVideos.forEach(video => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  });

  // Hide deadAir and offline display
  if (deadAir) deadAir.style.display = "none";
  if (offlineDisplay) offlineDisplay.style.display = "none";

  // Expand video display on mobile
  if (window.innerWidth <= 700 && videoDisplay) {
    videoDisplay.classList.add("active", "touched");
    videoDisplay.style.height = "180px";
  }

  // Create and configure orientation video
  const orientationVideo = document.createElement("video");
  orientationVideo.setAttribute("id", "orientation-video");
  orientationVideo.setAttribute("playsinline", "");
  orientationVideo.setAttribute("webkit-playsinline", "");
  
  // Check if user has already interacted (audio should be enabled)
  const hasInteracted = sessionStorage.getItem('hasInteracted') === 'true';
  if (!hasInteracted) {
    orientationVideo.setAttribute("muted", "");
  } else {
    // Audio enabled - set volume
    orientationVideo.volume = 0.7;
  }
  
  orientationVideo.setAttribute("preload", "auto");
  orientationVideo.style.cssText = `
    width: 100%; height: 100%; object-fit: cover;
    position: absolute; top: 0; left: 0; z-index: 100;
    display: block; opacity: 0; transition: opacity 0.5s ease-in-out;
    background-color: #000;
  `;

  // Create loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "video-loading-indicator";
  loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <div>Loading orientation...</div>
  `;
  loadingIndicator.style.cssText = `
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    z-index: 110; color: var(--accent-cyan); text-align: center;
  `;

  // Set video source
  orientationVideo.src = "/orientation.mp4";

  // Handle video ready to play
  orientationVideo.addEventListener("canplay", () => {
    console.log("✅ Video canplay event fired");
    
    disableToggles();
    
    setTimeout(() => {
      if (loadingIndicator.parentNode) {
        loadingIndicator.remove();
      }
      
      orientationVideo.style.opacity = "1";
      
      orientationVideo.play()
        .then(() => {
          console.log("✅ Orientation video playing");
          showTranscriptForOrientationVideo();
          
          // 🆕 Show CONNECT button immediately when video starts (skip option)
          setTimeout(() => {
            const buttonLabel = signalButton?.querySelector(".button-label");
            const buttonPrefix = signalButton?.querySelector(".button-prefix");
            if (buttonLabel) {
              // Change button to CONNECT during video (can skip)
              buttonLabel.textContent = "CONNECT";
              // Add visual indication that video can be skipped
              // if (buttonPrefix) {
              //   buttonPrefix.textContent = "SKIP// 🚀";
              // }
              console.log("🔄 CONNECT button available (video can be skipped)");
              
              // Add a subtle pulse animation to draw attention
              signalButton?.classList.add("can-skip");
              
              // Remove skip indication when video ends naturally
              orientationVideo.addEventListener("ended", () => {
                // if (buttonPrefix) {
                //   buttonPrefix.textContent = "SIG// 👽";
                // }
                signalButton?.classList.remove("can-skip");
              }, { once: true });
            }
          }, 2000); // Show CONNECT option after 2 seconds of video
        })
        .catch(err => {
          console.error("❌ Error playing orientation video:", err);
          handleVideoPlayError(orientationVideo, offlineDisplay);
        });
    }, 500);
  });

  // Handle video error
  orientationVideo.addEventListener("error", (e) => {
    console.error("❌ Video error:", e);
    if (loadingIndicator.parentNode) {
      loadingIndicator.innerHTML = `
        <div>ERROR LOADING VIDEO</div>
        <div style="font-size: 0.8em; margin-top: 5px;">Tap to retry</div>
      `;
      loadingIndicator.style.cursor = "pointer";
      loadingIndicator.addEventListener("click", () => playOrientationVideo());
    }
  });

  // Handle video end
  orientationVideo.addEventListener("ended", () => {
    console.log("🏁 Video ended");
    
    // Clean up video
    orientationVideo.pause();
    orientationVideo.currentTime = 0;
    orientationVideo.src = "";
    orientationVideo.removeAttribute("src");
    orientationVideo.load();
    
    // Keep button as CONNECT after video ends (user can now connect to SitePal)
    const buttonLabel = signalButton?.querySelector(".button-label");
    if (buttonLabel) {
      buttonLabel.textContent = "CONNECT";
    }
    
    // Mark as viewed
    if (signalButton) {
      signalButton.setAttribute("data-video-viewed", "true");
    }
    localStorage.setItem("orientationViewed", "true");
    
    // Hide transcript and restore display
    hideTranscript();
    enableToggles();
    
    // Only show offline display, not deadAir video
    if (deadAir) deadAir.style.display = "none";
    if (offlineDisplay) offlineDisplay.style.display = "flex";
    
    setTimeout(() => {
      orientationVideo.remove();
    }, 300);
    
    window.orientationComplete = true;
  });

  // Add to video feed
  if (videoFeed) {
    videoFeed.appendChild(loadingIndicator);
    videoFeed.appendChild(orientationVideo);
  }
}

// Function to stop orientation video
function stopOrientationVideo(isManualStop = true) {
  const orientationVideo = document.getElementById("orientation-video");
  const deadAir = document.getElementById("deadAir");
  const offlineDisplay = document.getElementById("offline-display");
  const loadingIndicator = document.querySelector(".video-loading-indicator");

  if (!orientationVideo) return;

  orientationVideo.pause();
  orientationVideo.currentTime = 0;
  orientationVideo.src = "";
  orientationVideo.removeAttribute("src");
  orientationVideo.load();
  
  orientationVideo.onloadstart = null;
  orientationVideo.onloadedmetadata = null;
  orientationVideo.onended = null;

  if (loadingIndicator) loadingIndicator.remove();
  
  setTimeout(() => {
    orientationVideo.remove();
    // Only show offline display, not deadAir video
    if (deadAir) deadAir.style.display = "none";
    if (offlineDisplay) offlineDisplay.style.display = "flex";
    
    // Always hide transcript when orientation video stops
    hideTranscript();
    enableToggles();
    
    window.orientationComplete = true;
  }, 300);
}

// Transcript functions
function showTranscriptForOrientationVideo() {
  const transcriptToggleBtn = document.querySelector('.transcript-toggle-btn');
  const transcriptContainer = document.querySelector('.transcript-container');
  const transcriptContent = document.querySelector('.transcript-content');
  const expandIcon = document.getElementById('transcript-expand-icon');

  // Show the transcript container during orientation video
  if (transcriptContainer) {
    transcriptContainer.style.display = 'block';
    console.log("📄 Transcript container shown for orientation video");
  }

  // Keep transcript content collapsed by default
  if (transcriptContent) {
    transcriptContent.classList.add('collapsed');
    transcriptState.isVisible = false;
  }

  // Update expand icon to show collapsed state (sideways arrow)
  if (expandIcon) {
    expandIcon.textContent = '▶';
    expandIcon.style.cursor = 'pointer';
    expandIcon.style.padding = '5px';
    expandIcon.style.userSelect = 'none';
  }

  if (transcriptToggleBtn) {
    transcriptToggleBtn.style.display = "flex";
    transcriptToggleBtn.classList.add("pulse-attention");
  }

  initTranscriptForVideo();
  
  // Ensure container never gets collapsed class
  if (transcriptContainer) {
    transcriptContainer.classList.remove('collapsed');
  }

  const orientationVideo = document.getElementById("orientation-video");
  if (orientationVideo) {
    orientationVideo.addEventListener("ended", function() {
      // Hide transcript container when video ends
      const transcriptContainer = document.querySelector('.transcript-container');
      if (transcriptContainer) {
        transcriptContainer.style.display = 'none';
        console.log("📄 Transcript container hidden - video ended");
      }

      if (transcriptToggleBtn) {
        transcriptToggleBtn.classList.remove("pulse-attention");
        transcriptToggleBtn.style.display = "none";
      }

      if (transcriptState.isVisible) {
        toggleTranscriptVisibility();
      }

      if (transcriptState.interval) {
        clearInterval(transcriptState.interval);
        transcriptState.interval = null;
      }
    });
  }
}

function initTranscriptForVideo() {
  // Use the new updateTranscriptContent function to populate transcript
  updateTranscriptContent();
  
  // Start transcript synchronization
  syncTranscriptWithVideo();
}

function syncTranscriptWithVideo() {
  const orientationVideo = document.getElementById("orientation-video");
  if (!orientationVideo) {
    useTimerBasedHighlighting();
    return;
  }

  let segments = document.querySelectorAll(".transcript-segment");
  if (segments.length === 0) return;

  transcriptState.currentSegmentIndex = 0;
  segments[0]?.classList.add("active");

  const updateTranscript = function() {
    const currentTime = orientationVideo.currentTime;
    
    // Get current language transcript data dynamically on each update
    const transcriptSegments = transcriptData[transcriptState.currentLanguage] || transcriptData.en;
    // Get current segments dynamically in case language changed
    segments = document.querySelectorAll(".transcript-segment");
    
    for (let i = transcriptSegments.length - 1; i >= 0; i--) {
      if (currentTime >= transcriptSegments[i].time) {
        if (transcriptState.currentSegmentIndex !== i) {
          segments[transcriptState.currentSegmentIndex]?.classList.remove("active");
          transcriptState.currentSegmentIndex = i;
          segments[i]?.classList.add("active");
          
          // Auto-scroll to active segment
          segments[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }
    }
  };

  // Remove any existing event listeners to prevent duplicates
  orientationVideo.removeEventListener('timeupdate', updateTranscript);
  orientationVideo.addEventListener('timeupdate', updateTranscript);
}

function useTimerBasedHighlighting() {
  const segments = document.querySelectorAll(".transcript-segment");
  if (segments.length === 0) return;

  transcriptState.currentSegmentIndex = 0;
  segments[0]?.classList.add("active");

  transcriptState.interval = setInterval(() => {
    segments[transcriptState.currentSegmentIndex]?.classList.remove("active");
    transcriptState.currentSegmentIndex = (transcriptState.currentSegmentIndex + 1) % segments.length;
    segments[transcriptState.currentSegmentIndex]?.classList.add("active");
  }, 2500);
}

function toggleTranscriptVisibility() {
  const transcriptContainer = document.querySelector('.transcript-container');
  const transcriptToggleBtn = document.querySelector('.transcript-toggle-btn');
  
  if (!transcriptContainer) return;
  
  transcriptState.isVisible = !transcriptState.isVisible;
  
  if (transcriptState.isVisible) {
    transcriptContainer.style.display = 'block';
    transcriptToggleBtn?.classList.add('active');
  } else {
    transcriptContainer.style.display = 'none';
    transcriptToggleBtn?.classList.remove('active');
  }
}

function hideTranscript() {
  const transcriptContainer = document.querySelector('.transcript-container');
  const transcriptToggleBtn = document.querySelector('.transcript-toggle-btn');
  
  if (transcriptContainer) transcriptContainer.style.display = 'none';
  if (transcriptToggleBtn) {
    transcriptToggleBtn.style.display = 'none';
    transcriptToggleBtn.classList.remove('active', 'pulse-attention');
  }
  
  transcriptState.isVisible = false;
  
  if (transcriptState.interval) {
    clearInterval(transcriptState.interval);
    transcriptState.interval = null;
  }
}

// SitePal functions
function handleSitePalConnection(button) {
  console.log("🔗 Starting SitePal connection sequence...");
  
  isCallActive = true;
  window.sceneAlreadyLoaded = false;
  window.allowButtonTransition = true;
  window.greetingPlayed = false;

  button.classList.add("signal-pulse");
  disableToggles();

  const deadAir = document.getElementById("deadAir");
  const sitepalContainer = document.getElementById("sitepal-container");
  const offlineDisplay = document.getElementById("offline-display");

  console.log("📺 Setting up video transition...");
  
  // Hide offline display
  if (offlineDisplay) {
    offlineDisplay.style.display = "none";
    console.log("🚫 Offline display hidden");
  }

  // Set up deadAir video for transmission effect with high z-index to cover SitePal loader
  if (deadAir) {
    // Ensure we're using 1.mp4 for transmission effect
    deadAir.src = "/1.mp4";
    deadAir.style.display = "block";
    deadAir.style.opacity = 1;
    deadAir.style.zIndex = "100"; // High z-index to cover SitePal loader
    deadAir.style.position = "absolute";
    deadAir.style.top = "0";
    deadAir.style.left = "0";
    deadAir.style.width = "100%";
    deadAir.style.height = "100%";
    deadAir.style.objectFit = "cover";
    deadAir.muted = true;
    deadAir.loop = true;
    
    // Actually play the deadAir video for the transmission effect
    deadAir.play().then(() => {
      console.log("📡 Transmission effect (1.mp4) playing at high z-index to cover loader...");
    }).catch(e => {
      console.warn("⚠️ Could not play transmission video:", e);
    });
  }

  // Prepare SitePal container
  if (sitepalContainer) {
    sitepalContainer.style.display = "block";
    sitepalContainer.style.zIndex = "5";
    console.log("📦 SitePal container prepared");
    
    if (sitepalContainer.dataset.initialized === "true") {
      console.log("🧹 Cleaning up existing SitePal instance...");
      cleanupSitePal();
    }
  }

  // Activate call status indicator
  const callStatus = document.getElementById("call-status");
  if (callStatus) {
    callStatus.classList.add("active");
    console.log("📞 Call status activated");
  }

  // Initialize SitePal with a delay to allow video transition
  setTimeout(() => {
    console.log("⏰ Triggering SitePal initialization via HTML implementation...");
    // The original HTML implementation handles SitePal initialization
    // We just need to trigger the existing initSitePal function
    if (typeof initSitePal === "function") {
      console.log("🎯 Found initSitePal function, calling it...");
      initSitePal();
    } else {
      console.warn("⚠️ initSitePal function not found in HTML implementation");
      console.log("Available functions:", Object.keys(window).filter(key => key.includes('SitePal') || key.includes('initSitePal')));
    }
    
    if (sitepalContainer) {
      sitepalContainer.dataset.initialized = "true";
    }
  }, 1500);

  // Don't auto-trigger unmute - wait for user to click UN-MUTE
  console.log("⏸️ SitePal loaded, waiting for user to click UN-MUTE...");

  // Update button state to DISCONNECT for text-only mode (skip UN-MUTE)
  setTimeout(() => {
    const buttonLabel = button.querySelector(".button-label");
    if (buttonLabel) {
      buttonLabel.textContent = "DISCONNECT";
      console.log("🏷️ Button label updated to DISCONNECT (text-only mode)");
    }
    button.classList.remove("signal-pulse");
    button.classList.add("disconnect");
    button.setAttribute("data-state", "disconnect");
    
    // Notify parent about button state change
    if (window.parent) {
      window.parent.postMessage({
        type: "SIGNAL_BUTTON_STATE",
        state: "disconnect",
        label: "DISCONNECT"
      }, "*");
    }
    
    console.log("✅ Text-only communication ready - no UN-MUTE required");
  }, 3000); // Faster activation for text mode
}

function handleUnmuteClick(button) {
  console.log("🎤 Handling UN-MUTE click...");
  
  const buttonLabel = button.querySelector(".button-label");
  if (buttonLabel) {
    buttonLabel.textContent = "DISCONNECT";
  }
  button.classList.remove("unmute");
  button.classList.add("disconnect");
  button.setAttribute("data-state", "disconnect");
  
  // Notify parent about button state change
  if (window.parent) {
    window.parent.postMessage({
      type: "SIGNAL_BUTTON_STATE",
      state: "disconnect",
      label: "DISCONNECT"
    }, "*");
  }
  
  // Call the SitePal greeting function from HTML
  if (typeof window.sitePalGreeting === "function") {
    console.log("🗣️ Calling SitePal greeting function...");
    window.sitePalGreeting();
  } else {
    console.warn("⚠️ SitePal greeting function not available");
  }
}

function handleSitePalDisconnection(button) {
  console.log("🔌 Starting SitePal disconnection...");
  
  isCallActive = false;
  button.classList.remove("signal-pulse", "disconnect");
  
  const buttonLabel = button.querySelector(".button-label");
  const buttonPrefix = button.querySelector(".button-prefix");
  if (buttonLabel) buttonLabel.textContent = "SIGNAL";
  if (buttonPrefix) buttonPrefix.textContent = "SIG// 👽";

  const callStatus = document.getElementById("call-status");
  if (callStatus) callStatus.classList.remove("active");

  // Hide text communication interface
  const textCommContainer = document.getElementById("text-comm-container");
  if (textCommContainer) {
    textCommContainer.style.display = "none";
    console.log("📝 Text communication interface hidden");
  }

  // Call the HTML disconnection function if available
  if (typeof disconnectSitePal === "function") {
    console.log("🧹 Calling HTML SitePal disconnect function...");
    disconnectSitePal();
  }

  const sitepalContainer = document.getElementById("sitepal-container");
  if (sitepalContainer) {
    sitepalContainer.style.display = "none";
    cleanupSitePal();
  }

  const deadAir = document.getElementById("deadAir");
  const offlineDisplay = document.getElementById("offline-display");
  
  // Stop deadAir video and show offline display
  if (deadAir) {
    deadAir.pause();
    deadAir.style.display = "none";
    deadAir.style.opacity = 0;
  }
  if (offlineDisplay) {
    offlineDisplay.style.display = "flex";
    console.log("📺 Offline display restored");
  }

  // Notify parent about disconnection
  if (window.parent) {
    window.parent.postMessage({
      type: "SIGNAL_BUTTON_STATE",
      state: "signal",
      label: "SIGNAL"
    }, "*");
  }

  enableToggles();
  console.log("✅ SitePal disconnection complete");
}

function cleanupSitePal() {
  console.log("🧹 Cleaning up SitePal...");
  
  const sitepalContainer = document.getElementById("sitepal-container");
  if (sitepalContainer) {
    sitepalContainer.innerHTML = `
      <div id="vhss_aiPlayer"></div>
      <div id="vhss-aiplayer-aiformlogs"></div>
      <div id="vhss-aiplayer-aiformtranscript"></div>
      <div id="vhss-aiplayer-aiformstatus"></div>
    `;
    sitepalContainer.dataset.initialized = "false";
    sitepalContainer.classList.remove("active");
  }
  
  // Clean up any SitePal API functions
  if (window.AI_vhost_api && typeof window.AI_vhost_api === "function") {
    try {
      window.AI_vhost_api("stopListening");
    } catch (e) {
      console.log("Could not stop listening:", e);
    }
  }
  
  // Clear any SitePal-related window functions
  window.saySilent = undefined;
  window.sayText = undefined;
  window.stopListening = undefined;
  window.stopSpeaking = undefined;
}

// Enhanced SitePal initialization - delegated to HTML implementation
// This function exists but the actual SitePal logic is in the HTML file

// SitePal loading functions are now handled in the HTML file

// Text Communication Functions
function initializeTextCommunication() {
  console.log('📝 Text communication will be handled by SitePal auto-generated AI form');
  
  // SitePal should auto-generate the AI form when AI=1 is set in the embed call
  // The form will appear in the #vhss-aiplayer-aiform div
  
  // Check periodically if SitePal has generated the AI form
  let checkCount = 0;
  const maxChecks = 20;
  
  const checkForAIForm = () => {
    checkCount++;
    const aiFormDiv = document.getElementById('vhss-aiplayer-aiform');
    
    if (aiFormDiv && aiFormDiv.innerHTML.trim() !== '') {
      console.log('✅ SitePal AI form has been generated!');
      updateTextCommStatus('READY');
      return;
    }
    
    if (checkCount < maxChecks) {
      console.log(`⏳ Waiting for SitePal AI form... (${checkCount}/${maxChecks})`);
      setTimeout(checkForAIForm, 1000);
    } else {
      console.log('📝 Using custom AI input interface instead of auto-generated form');
      updateTextCommStatus('READY');
    }
  };
  
  // Start checking after a brief delay
  setTimeout(checkForAIForm, 2000);
}

function triggerSitePalTextSend() {
  const textInput = document.getElementById('Input.vhss-ai-text');
  const message = textInput?.value?.trim();
  
  if (!message) {
    console.warn('⚠️ No message to send');
    return;
  }
  
  console.log('📤 Triggering SitePal text send:', message);
  updateTextCommStatus('TRANSMITTING...');
  
  // Create and dispatch an Enter key event to trigger SitePal's native handling
  const enterEvent = new KeyboardEvent('keypress', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true
  });
  
  textInput.dispatchEvent(enterEvent);
  
  // Visual feedback
  textInput.style.backgroundColor = 'rgba(0, 255, 65, 0.1)';
  setTimeout(() => {
    textInput.style.backgroundColor = '';
    updateTextCommStatus('READY');
  }, 2000);
}

function updateTextCommStatus(status) {
  const statusElement = document.getElementById('text-comm-status');
  if (statusElement) {
    statusElement.textContent = status;
    switch(status) {
      case 'TRANSMITTING...':
        statusElement.style.color = '#ff6b00';
        break;
      case 'ERROR':
        statusElement.style.color = '#ff0000';
        break;
      default:
        statusElement.style.color = '#00ff41';
    }
  }
}

// Toggle disable/enable functions
function disableToggles() {
  const toggles = document.querySelectorAll('.toggle-switch');
  toggles.forEach(toggle => {
    if (toggle.classList.contains('music') || toggle.classList.contains('eighties')) {
      toggle.classList.add('disabled');
    }
  });
}

function enableToggles() {
  const toggles = document.querySelectorAll('.toggle-switch');
  toggles.forEach(toggle => {
    toggle.classList.remove('disabled');
  });
}

function handleVideoPlayError(video, offlineDisplay) {
  console.error("Failed to play orientation video");
  if (video) video.remove();
  if (offlineDisplay) offlineDisplay.style.display = "block";
  enableToggles();
}

// Function to trigger the unmute sequence for full SitePal activation
function triggerUnmuteSequence(button) {
  console.log("🎤 Starting unmute sequence for SitePal...");
  
  try {
    // First, ensure audio context is ready
    if (window.myAudioContext && window.myAudioContext.state === 'suspended') {
      window.myAudioContext.resume().then(() => {
        console.log("🔊 AudioContext resumed for SitePal");
      });
    }
    
    // Try to activate SitePal's listening mode
    if (typeof window.AI_vhost_api === "function") {
      console.log("🎤 Activating AI_vhost_api startListening...");
      window.AI_vhost_api("startListening");
    }
    
    // Also try the global functions if available
    if (typeof startListening === "function") {
      console.log("🎤 Calling global startListening function...");
      startListening();
    }
    
    // Play a greeting message with proper TTS to activate mouth movement
    if (typeof window.sayText === "function") {
      console.log("👋 Playing TTS greeting to activate mouth movement...");
      setTimeout(() => {
        window.sayText("Hello, Earthling. I am now ready to listen and respond to your voice.");
      }, 1000);
    } else if (typeof sayText === "function") {
      console.log("👋 Playing TTS greeting using global sayText...");
      setTimeout(() => {
        sayText("Hello, Earthling. I am now ready to listen and respond to your voice.");
      }, 1000);
    }
    
    // Ensure microphone access is properly granted
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log("✅ Microphone access confirmed for SitePal");
          // Don't stop the stream immediately - let SitePal use it
          window.sitepalMicStream = stream;
        })
        .catch(error => {
          console.warn("⚠️ Microphone access failed:", error);
        });
    }
    
    console.log("✅ Unmute sequence completed");
    
  } catch (error) {
    console.error("❌ Error in unmute sequence:", error);
  }
}

// Special handling for iframe mode
if (window !== window.parent) {
  document.addEventListener('DOMContentLoaded', function() {
    document.body.style.backgroundColor = 'transparent';
    
    // Add special handling for the signal button
    const signalButton = document.querySelector('.control-button[data-action="signal"]');
    if (signalButton) {
      signalButton.classList.add('sitepal-related');
      
      signalButton.addEventListener('click', function() {
        const currentState = this.getAttribute('data-state');
        const buttonLabel = this.querySelector('.button-label')?.textContent;
        
        // Notify parent of button state change
        if (window.parent) {
          window.parent.postMessage({
            type: 'SIGNAL_BUTTON_STATE',
            state: currentState,
            label: buttonLabel
          }, '*');
        }
      });
    }
  });
}