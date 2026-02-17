var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  const TEAM_SIDEBAR_RESIZER_ID = "mm-team-sidebar-resizer";
  const TEAM_SIDEBAR_EXPANDED_CLASS = "mm-team-sidebar-expanded";
  const TEAM_SIDEBAR_EXPANDED_MIN_WIDTH = 52;
  const TEAM_SIDEBAR_EXPANDED_MAX_WIDTH = 230;
  const TEAM_SIDEBAR_EXPANDED_THRESHOLD = 70;
  const isFeatureEnabled = (key, defaultVal = false) => {
    const val = localStorage.getItem(key);
    if (val === null) return defaultVal;
    return val === "1" || val === "true";
  };
  const setFeatureEnabled = (key, val) => {
    localStorage.setItem(key, val ? "1" : "0");
  };
  const isMattermost = () => {
    const root = document.getElementById("root");
    if (root) {
      if (document.getElementById("mattermost-view-container")) return true;
      if (root.querySelector(".channel-view")) return true;
    }
    if (document.querySelector('meta[name="application-name"][content="Mattermost"]')) return true;
    if (document.querySelector('meta[name="apple-mobile-web-app-title"][content="Mattermost"]')) return true;
    const noscript = document.querySelector("noscript");
    if (noscript?.textContent?.includes("Mattermost")) return true;
    return false;
  };
  const EXTENSION_SETTINGS_TAB_ID = "matterUiSettings";
  const EXTENSION_SETTINGS_BUTTON_ID = "matterUiButton";
  const SETTING_RESIZER_KEY = "mm-team-sidebar-resizer-enabled";
  const SETTING_DM_KEY = "mm-dm-view-enabled";
  const SETTING_CALLS_KEY = "mm-hide-calls-enabled";
  const STORAGE_KEY_WIDTH = "mm-team-sidebar-width";
  const ANIMATION_DURATION_MS = 300;
  const ANIMATING_CLASS = "mm-team-sidebar-animating";
  const updateExpandedClass = (container, overrideWidth) => {
    const width = overrideWidth ?? container.getBoundingClientRect().width;
    const expanded = width > TEAM_SIDEBAR_EXPANDED_THRESHOLD;
    container.classList.toggle(TEAM_SIDEBAR_EXPANDED_CLASS, expanded);
  };
  const setupTeamSidebarResizer = (container) => {
    window.addEventListener("mm-extension-setting-changed", (event) => {
      if (event.detail?.key === SETTING_RESIZER_KEY) {
        updateFeatureState$2(container);
      }
    });
    updateFeatureState$2(container);
  };
  const updateFeatureState$2 = (container) => {
    const enabled = isFeatureEnabled(SETTING_RESIZER_KEY, true);
    if (!enabled) {
      teardownTeamSidebarResizer(container);
      return;
    }
    initTeamSidebarResizer(container);
  };
  const teardownTeamSidebarResizer = (container) => {
    const handle = container.querySelector(`#${TEAM_SIDEBAR_RESIZER_ID}`);
    if (handle) handle.remove();
    container.classList.remove(TEAM_SIDEBAR_EXPANDED_CLASS);
    container.classList.remove(ANIMATING_CLASS);
    container.style.width = "";
    container.style.maxWidth = "";
    container.style.flex = "";
    container.style.minWidth = "";
    container.style.position = "";
  };
  const initTeamSidebarResizer = (container) => {
    if (container.querySelector(`#${TEAM_SIDEBAR_RESIZER_ID}`)) return;
    const style = getComputedStyle(container);
    if (style.position !== "relative") {
      container.style.position = "relative";
    }
    const initialWidth = container.getBoundingClientRect().width;
    container.style.flex = "0 0 auto";
    container.style.minWidth = `${Math.max(TEAM_SIDEBAR_EXPANDED_MIN_WIDTH, Math.round(initialWidth))}px`;
    const savedWidth = localStorage.getItem(STORAGE_KEY_WIDTH);
    if (savedWidth) {
      const width = parseFloat(savedWidth);
      if (!isNaN(width)) {
        container.style.width = `${width}px`;
        container.style.maxWidth = `${width}px`;
      }
    }
    updateExpandedClass(container);
    const handle = document.createElement("div");
    handle.id = TEAM_SIDEBAR_RESIZER_ID;
    handle.style.position = "absolute";
    handle.style.top = "0";
    handle.style.right = "0";
    handle.style.width = "6px";
    handle.style.height = "100%";
    handle.style.cursor = "col-resize";
    handle.style.zIndex = "9999";
    container.appendChild(handle);
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    const saveState = () => {
      const width = container.getBoundingClientRect().width;
      localStorage.setItem(STORAGE_KEY_WIDTH, width.toString());
    };
    const onMouseMove = (event) => {
      if (!isDragging) return;
      const minWidth = parseFloat(container.style.minWidth) || TEAM_SIDEBAR_EXPANDED_MIN_WIDTH;
      const next = Math.min(
        TEAM_SIDEBAR_EXPANDED_MAX_WIDTH,
        Math.max(minWidth, startWidth + (event.clientX - startX))
      );
      container.style.width = `${next}px`;
      container.style.maxWidth = `${next}px`;
      updateExpandedClass(container);
    };
    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      updateExpandedClass(container);
      saveState();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      isDragging = true;
      startX = event.clientX;
      startWidth = container.getBoundingClientRect().width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
    handle.addEventListener("dblclick", (event) => {
      event.preventDefault();
      const currentWidth = container.getBoundingClientRect().width;
      const isExpanded = currentWidth > TEAM_SIDEBAR_EXPANDED_THRESHOLD;
      let nextWidth;
      if (isExpanded) {
        nextWidth = parseFloat(container.style.minWidth) || TEAM_SIDEBAR_EXPANDED_MIN_WIDTH;
      } else {
        nextWidth = TEAM_SIDEBAR_EXPANDED_MAX_WIDTH;
      }
      container.classList.add(ANIMATING_CLASS);
      container.style.width = `${nextWidth}px`;
      container.style.maxWidth = `${nextWidth}px`;
      if (!isExpanded) {
        updateExpandedClass(container, nextWidth);
      }
      saveState();
      setTimeout(() => {
        container.classList.remove(ANIMATING_CLASS);
        if (isExpanded) {
          updateExpandedClass(container, nextWidth);
        }
      }, ANIMATION_DURATION_MS);
    });
  };
  const dmIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 548.244 548.244" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path fill-rule="evenodd" d="M392.19 156.054 211.268 281.667 22.032 218.58C8.823 214.168-.076 201.775 0 187.852c.077-13.923 9.078-26.24 22.338-30.498L506.15 1.549c11.5-3.697 24.123-.663 32.666 7.88 8.542 8.543 11.577 21.165 7.879 32.666L390.89 525.906c-4.258 13.26-16.575 22.261-30.498 22.338-13.923.076-26.316-8.823-30.728-22.032l-63.393-190.153z" clip-rule="evenodd" fill="#ffffff" opacity="1" data-original="#ffffff" class=""></path></g></svg>\n';
  const MM_SELECTORS = {
    // Team Sidebar
    TEAM_SIDEBAR: ".team-sidebar",
    DROPPABLE_TEAMS: '[data-rbd-droppable-id="my_teams"]',
    DRAGGABLE_TEAM_ITEM: "a.draggable-team-container",
    TEAM_CONTAINER: ".team-container",
    TEAM_ICON: ".TeamIcon",
    // Sidebar Channels
    SIDEBAR_CHANNEL_GROUP: ".SidebarChannelGroup",
    SIDEBAR_CHANNEL_GROUP_HEADER_TEXT: ".SidebarChannelGroupHeader_text",
    CHANNEL_LIST_ITEM: "li, .SidebarChannel, .SidebarChannelGroup",
    SIDEBAR_CHANNEL_BADGE: ".badge, .SidebarChannelBadge, .SidebarChannelBadge__icon",
    // Headers
    TEAM_HEADER: [
      ".team__name",
      ".sidebar-header__title",
      '[data-testid="teamSidebarHeader"] .team__name',
      ".SidebarHeader .team__name",
      ".SidebarHeader h1",
      '[data-testid="teamSidebarHeader"] h1',
      ".sidebarHeaderContainer h1"
    ],
    ICON_CHEVRON_DOWN: ".icon-chevron-down",
    // Settings Modal
    USER_SETTINGS_MODAL: ".UserSettingsModal",
    TAB_LIST: "#tabList",
    PLUGIN_PREFERENCES_HEADER: '[aria-labelledby="userSettingsModal.pluginPreferences.header"]',
    SETTINGS_CONTENT: ".settings-content div",
    NAV_PILLS_TAB: ".nav-pills__tab",
    // Calls
    CALLS_JOIN_BUTTON: "#calls-join-button",
    // Detection
    ROOT: "#root",
    VIEW_CONTAINER: "#mattermost-view-container",
    CHANNEL_VIEW: ".channel-view"
  };
  const findTeamSidebar = () => {
    return document.querySelector(MM_SELECTORS.TEAM_SIDEBAR);
  };
  const en = { "dm_header": "Direct Messages", "unread_header": "Unreads", "dm_item_label": "Direct", "dm_item_aria_label": "Direct Messages", "settings_title": "MatterUI", "settings_header": "MatterUI Settings", "setting_resizer_title": "Resizable Team Sidebar", "setting_resizer_desc": "Allows resizing the team sidebar width", "setting_dm_title": "Separate Direct Messages", "setting_dm_desc": "Moves direct messages to a separate tab", "setting_calls_title": "Hide Call Button", "setting_calls_desc": "Hides the call button in the channel header", "label_on": "On", "label_off": "Off", "label_edit": "Edit", "label_save": "Save", "label_cancel": "Cancel" };
  const ru = { "dm_header": "Личные сообщения", "unread_header": "Непрочитанные", "dm_item_label": "Личные", "dm_item_aria_label": "Личные сообщения", "settings_title": "MatterUI", "settings_header": "Настройки MatterUI", "setting_resizer_title": "Подвижное меню команд", "setting_resizer_desc": "Позволяет изменять ширину боковой панели команд", "setting_dm_title": "Личные сообщения отдельно", "setting_dm_desc": "Выносит личные сообщения в отдельную вкладку", "setting_calls_title": "Скрыть кнопку звонков", "setting_calls_desc": "Скрывает кнопку звонков в заголовке канала", "label_on": "Вкл", "label_off": "Выкл", "label_edit": "Изменить", "label_save": "Сохранить", "label_cancel": "Отмена" };
  const de = { "dm_header": "Direktnachrichten", "unread_header": "Ungelesen", "dm_item_label": "Direkt", "dm_item_aria_label": "Direktnachrichten", "settings_title": "MatterUI", "settings_header": "MatterUI Einstellungen", "setting_resizer_title": "Anpassbare Team-Seitenleiste", "setting_resizer_desc": "Erlaubt das Ändern der Breite der Team-Seitenleiste", "setting_dm_title": "Separate Direktnachrichten", "setting_dm_desc": "Verschiebt Direktnachrichten in einen eigenen Tab", "setting_calls_title": "Anruf-Button verbergen", "setting_calls_desc": "Verbirgt den Anruf-Button im Kanal-Header", "label_on": "Ein", "label_off": "Aus", "label_edit": "Bearbeiten", "label_save": "Speichern", "label_cancel": "Abbrechen" };
  const es = { "dm_header": "Mensajes Directos", "unread_header": "No leídos", "dm_item_label": "Directos", "dm_item_aria_label": "Mensajes Directos", "settings_title": "MatterUI", "settings_header": "Configuración de MatterUI", "setting_resizer_title": "Barra lateral de equipos redimensionable", "setting_resizer_desc": "Permite cambiar el ancho de la barra lateral de equipos", "setting_dm_title": "Mensajes Directos separados", "setting_dm_desc": "Mueve los mensajes directos a una pestaña separada", "setting_calls_title": "Ocultar botón de llamada", "setting_calls_desc": "Oculta el botón de llamada en el encabezado del canal", "label_on": "Encendido", "label_off": "Apagado", "label_edit": "Editar", "label_save": "Guardar", "label_cancel": "Cancelar" };
  const fr = { "dm_header": "Messages Directs", "unread_header": "Non lus", "dm_item_label": "Directs", "dm_item_aria_label": "Messages Directs", "settings_title": "MatterUI", "settings_header": "Paramètres MatterUI", "setting_resizer_title": "Barre latérale d'équipe redimensionnable", "setting_resizer_desc": "Permet de redimensionner la largeur de la barre latérale d'équipe", "setting_dm_title": "Messages Directs séparés", "setting_dm_desc": "Déplace les messages directs dans un onglet séparé", "setting_calls_title": "Masquer le bouton d'appel", "setting_calls_desc": "Masque le bouton d'appel dans l'en-tête du canal", "label_on": "Activé", "label_off": "Désactivé", "label_edit": "Modifier", "label_save": "Enregistrer", "label_cancel": "Annuler" };
  const it = { "dm_header": "Messaggi Diretti", "unread_header": "Non letti", "dm_item_label": "Diretti", "dm_item_aria_label": "Messaggi Diretti", "settings_title": "MatterUI", "settings_header": "Impostazioni MatterUI", "setting_resizer_title": "Barra laterale team ridimensionabile", "setting_resizer_desc": "Consente di ridimensionare la larghezza della barra laterale del team", "setting_dm_title": "Messaggi Diretti separati", "setting_dm_desc": "Sposta i messaggi diretti in una scheda separata", "setting_calls_title": "Nascondi pulsante chiamata", "setting_calls_desc": "Nasconde il pulsante di chiamata nell'intestazione del canale", "label_on": "On", "label_off": "Off", "label_edit": "Modifica", "label_save": "Salva", "label_cancel": "Annulla" };
  const hu = { "dm_header": "Közvetlen üzenetek", "unread_header": "Olvasatlanok", "dm_item_label": "Üzenetek", "dm_item_aria_label": "Közvetlen üzenetek", "settings_title": "MatterUI", "settings_header": "MatterUI Beállítások", "setting_resizer_title": "Átméretezhető csapat oldalsáv", "setting_resizer_desc": "Lehetővé teszi a csapat oldalsáv szélességének módosítását", "setting_dm_title": "Külön Közvetlen üzenetek", "setting_dm_desc": "A közvetlen üzeneteket egy külön fülre helyezi át", "setting_calls_title": "Hívás gomb elrejtése", "setting_calls_desc": "Elrejti a hívás gombot a csatorna fejlécében", "label_on": "Be", "label_off": "Ki", "label_edit": "Szerkesztés", "label_save": "Mentés", "label_cancel": "Mégse" };
  const nl = { "dm_header": "Directe Berichten", "unread_header": "Ongelezen", "dm_item_label": "Direct", "dm_item_aria_label": "Directe Berichten", "settings_title": "MatterUI", "settings_header": "MatterUI Instellingen", "setting_resizer_title": "Aanpasbare Team Zijbalk", "setting_resizer_desc": "Maakt het mogelijk de breedte van de team zijbalk aan te passen", "setting_dm_title": "Aparte Directe Berichten", "setting_dm_desc": "Verplaatst directe berichten naar een apart tabblad", "setting_calls_title": "Verberg Belknop", "setting_calls_desc": "Verbergt de belknop in de kanaalkop", "label_on": "Aan", "label_off": "Uit", "label_edit": "Bewerken", "label_save": "Opslaan", "label_cancel": "Annuleren" };
  const pl = { "dm_header": "Wiadomości Bezpośrednie", "unread_header": "Nieprzeczytane", "dm_item_label": "Wiadomości", "dm_item_aria_label": "Wiadomości Bezpośrednie", "settings_title": "MatterUI", "settings_header": "Ustawienia MatterUI", "setting_resizer_title": "Zmienny rozmiar paska zespołów", "setting_resizer_desc": "Pozwala na zmianę szerokości paska bocznego zespołów", "setting_dm_title": "Oddzielne Wiadomości Bezpośrednie", "setting_dm_desc": "Przenosi wiadomości bezpośrednie do osobnej zakładki", "setting_calls_title": "Ukryj przycisk połączenia", "setting_calls_desc": "Ukrywa przycisk połączenia w nagłówku kanału", "label_on": "Wł.", "label_off": "Wył.", "label_edit": "Edytuj", "label_save": "Zapisz", "label_cancel": "Anuluj" };
  const ro = { "dm_header": "Mesaje Directe", "unread_header": "Necitite", "dm_item_label": "Directe", "dm_item_aria_label": "Mesaje Directe", "settings_title": "MatterUI", "settings_header": "Setări MatterUI", "setting_resizer_title": "Bară laterală echipe redimensionabilă", "setting_resizer_desc": "Permite redimensionarea lățimii barei laterale a echipelor", "setting_dm_title": "Mesaje Directe separate", "setting_dm_desc": "Mută mesajele directe într-o filă separată", "setting_calls_title": "Ascunde buton apel", "setting_calls_desc": "Ascunde butonul de apel din antetul canalului", "label_on": "Pornit", "label_off": "Oprit", "label_edit": "Editare", "label_save": "Salvare", "label_cancel": "Anulare" };
  const sv = { "dm_header": "Direktmeddelanden", "unread_header": "Olästa", "dm_item_label": "Direkt", "dm_item_aria_label": "Direktmeddelanden", "settings_title": "MatterUI", "settings_header": "MatterUI Inställningar", "setting_resizer_title": "Anpassningsbar Team-sidofält", "setting_resizer_desc": "Tillåter ändring av bredden på team-sidofältet", "setting_dm_title": "Separata Direktmeddelanden", "setting_dm_desc": "Flyttar direktmeddelanden till en separat flik", "setting_calls_title": "Dölj samtalsknapp", "setting_calls_desc": "Döljer samtalsknappen i kanalrubriken", "label_on": "På", "label_off": "Av", "label_edit": "Redigera", "label_save": "Spara", "label_cancel": "Avbryt" };
  const tr = { "dm_header": "Doğrudan Mesajlar", "unread_header": "Okunmamış", "dm_item_label": "Mesajlar", "dm_item_aria_label": "Doğrudan Mesajlar", "settings_title": "MatterUI", "settings_header": "MatterUI Ayarları", "setting_resizer_title": "Yeniden Boyutlandırılabilir Takım Kenar Çubuğu", "setting_resizer_desc": "Takım kenar çubuğu genişliğinin değiştirilmesine izin verir", "setting_dm_title": "Ayrı Doğrudan Mesajlar", "setting_dm_desc": "Doğrudan mesajları ayrı bir sekmeye taşır", "setting_calls_title": "Arama Düğmesini Gizle", "setting_calls_desc": "Kanal başlığındaki arama düğmesini gizler", "label_on": "Açık", "label_off": "Kapalı", "label_edit": "Düzenle", "label_save": "Kaydet", "label_cancel": "İptal" };
  const bg = { "dm_header": "Директни съобщения", "unread_header": "Непрочетени", "dm_item_label": "Съобщения", "dm_item_aria_label": "Директни съобщения", "settings_title": "MatterUI", "settings_header": "Настройки на MatterUI", "setting_resizer_title": "Преоразмерима странична лента", "setting_resizer_desc": "Позволява промяна на ширината на страничната лента на екипите", "setting_dm_title": "Отделни директни съобщения", "setting_dm_desc": "Премества директните съобщения в отделен раздел", "setting_calls_title": "Скрий бутона за повикване", "setting_calls_desc": "Скрива бутона за повикване в заглавката на канала", "label_on": "Вкл", "label_off": "Изкл", "label_edit": "Редактиране", "label_save": "Запази", "label_cancel": "Отказ" };
  const uk = { "dm_header": "Особисті повідомлення", "unread_header": "Непрочитані", "dm_item_label": "Особисті", "dm_item_aria_label": "Особисті повідомлення", "settings_title": "MatterUI", "settings_header": "Налаштування MatterUI", "setting_resizer_title": "Змінна ширина панелі команд", "setting_resizer_desc": "Дозволяє змінювати ширину бічної панелі команд", "setting_dm_title": "Окремі особисті повідомлення", "setting_dm_desc": "Виносить особисті повідомлення в окрему вкладку", "setting_calls_title": "Приховати кнопку дзвінка", "setting_calls_desc": "Приховує кнопку дзвінка в заголовку каналу", "label_on": "Увімк", "label_off": "Вимк", "label_edit": "Змінити", "label_save": "Зберегти", "label_cancel": "Скасувати" };
  const fa = { "dm_header": "پیام‌های مستقیم", "unread_header": "خوانده نشده", "dm_item_label": "پیام‌ها", "dm_item_aria_label": "پیام‌های مستقیم", "settings_title": "MatterUI", "settings_header": "تنظیمات MatterUI", "setting_resizer_title": "تغییر اندازه نوار کناری تیم", "setting_resizer_desc": "اجازه تغییر عرض نوار کناری تیم را می‌دهد", "setting_dm_title": "پیام‌های مستقیم جداگانه", "setting_dm_desc": "پیام‌های مستقیم را به یک تب جداگانه منتقل می‌کند", "setting_calls_title": "مخفی کردن دکمه تماس", "setting_calls_desc": "دکمه تماس را در سربرگ کانال مخفی می‌کند", "label_on": "روشن", "label_off": "خاموش", "label_edit": "ویرایش", "label_save": "ذخیره", "label_cancel": "لغو" };
  const ko = { "dm_header": "다이렉트 메시지", "unread_header": "읽지 않음", "dm_item_label": "DM", "dm_item_aria_label": "다이렉트 메시지", "settings_title": "MatterUI", "settings_header": "MatterUI 설정", "setting_resizer_title": "팀 사이드바 크기 조절", "setting_resizer_desc": "팀 사이드바 너비를 조절할 수 있습니다", "setting_dm_title": "다이렉트 메시지 분리", "setting_dm_desc": "다이렉트 메시지를 별도 탭으로 이동합니다", "setting_calls_title": "통화 버튼 숨기기", "setting_calls_desc": "채널 헤더의 통화 버튼을 숨깁니다", "label_on": "켜기", "label_off": "끄기", "label_edit": "편집", "label_save": "저장", "label_cancel": "취소" };
  const ja = { "dm_header": "ダイレクトメッセージ", "unread_header": "未読", "dm_item_label": "DM", "dm_item_aria_label": "ダイレクトメッセージ", "settings_title": "MatterUI", "settings_header": "MatterUI 設定", "setting_resizer_title": "チームサイドバーのサイズ変更", "setting_resizer_desc": "チームサイドバーの幅を変更できるようにします", "setting_dm_title": "ダイレクトメッセージを分離", "setting_dm_desc": "ダイレクトメッセージを別のタブに移動します", "setting_calls_title": "通話ボタンを隠す", "setting_calls_desc": "チャンネルヘッダーの通話ボタンを非表示にします", "label_on": "オン", "label_off": "オフ", "label_edit": "編集", "label_save": "保存", "label_cancel": "キャンセル" };
  const translationsJson = {
    en,
    "en-AU": { "dm_header": "Direct Messages", "unread_header": "Unreads", "dm_item_label": "Direct", "dm_item_aria_label": "Direct Messages", "settings_title": "MatterUI", "settings_header": "MatterUI Settings", "setting_resizer_title": "Resizable Team Sidebar", "setting_resizer_desc": "Allows resizing the team sidebar width", "setting_dm_title": "Separate Direct Messages", "setting_dm_desc": "Moves direct messages to a separate tab", "setting_calls_title": "Hide Call Button", "setting_calls_desc": "Hides the call button in the channel header", "label_on": "On", "label_off": "Off", "label_edit": "Edit", "label_save": "Save", "label_cancel": "Cancel" },
    ru,
    de,
    es,
    fr,
    it,
    hu,
    nl,
    pl,
    "pt-BR": { "dm_header": "Mensagens Diretas", "unread_header": "Não lidas", "dm_item_label": "Diretas", "dm_item_aria_label": "Mensagens Diretas", "settings_title": "MatterUI", "settings_header": "Configurações MatterUI", "setting_resizer_title": "Barra lateral de equipes redimensionável", "setting_resizer_desc": "Permite redimensionar a largura da barra lateral de equipes", "setting_dm_title": "Mensagens Diretas separadas", "setting_dm_desc": "Move as mensagens diretas para uma aba separada", "setting_calls_title": "Ocultar botão de chamada", "setting_calls_desc": "Oculta o botão de chamada no cabeçalho do canal", "label_on": "Ligado", "label_off": "Desligado", "label_edit": "Editar", "label_save": "Salvar", "label_cancel": "Cancelar" },
    ro,
    sv,
    tr,
    bg,
    uk,
    fa,
    ko,
    "zh-CN": { "dm_header": "私信", "unread_header": "未读", "dm_item_label": "私信", "dm_item_aria_label": "私信", "settings_title": "MatterUI", "settings_header": "MatterUI 设置", "setting_resizer_title": "可调整团队侧边栏", "setting_resizer_desc": "允许调整团队侧边栏宽度", "setting_dm_title": "独立私信标签", "setting_dm_desc": "将私信移动到单独的标签页", "setting_calls_title": "隐藏通话按钮", "setting_calls_desc": "隐藏频道顶部的通话按钮", "label_on": "开启", "label_off": "关闭", "label_edit": "编辑", "label_save": "保存", "label_cancel": "取消" },
    "zh-TW": { "dm_header": "私訊", "unread_header": "未讀", "dm_item_label": "私訊", "dm_item_aria_label": "私訊", "settings_title": "MatterUI", "settings_header": "MatterUI 設定", "setting_resizer_title": "可調整團隊側邊欄", "setting_resizer_desc": "允許調整團隊側邊欄寬度", "setting_dm_title": "獨立私訊分頁", "setting_dm_desc": "將私訊移動到單獨的分頁", "setting_calls_title": "隱藏通話按鈕", "setting_calls_desc": "隱藏頻道標題的通話按鈕", "label_on": "開啟", "label_off": "關閉", "label_edit": "編輯", "label_save": "儲存", "label_cancel": "取消" },
    ja
  };
  const translations = translationsJson;
  let currentLanguage = "en";
  const isSupportedLanguage = (lang) => {
    return lang in translations;
  };
  const normalizeLocale = (locale) => {
    if (!locale) return "en";
    if (isSupportedLanguage(locale)) return locale;
    const part = locale.split("-")[0];
    if (isSupportedLanguage(part)) return part;
    return "en";
  };
  const initLanguage = async () => {
    try {
      const response = await fetch("/api/v4/users/me");
      if (response.ok) {
        const data = await response.json();
        if (data && data.locale) {
          setLanguageFromLocale(data.locale);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch user locale", e);
    }
    const htmlLang = document.documentElement.lang;
    const browserLang = navigator.language;
    const detectedLang = normalizeLocale(htmlLang) !== "en" ? normalizeLocale(htmlLang) : normalizeLocale(browserLang);
    if (isSupportedLanguage(detectedLang)) {
      currentLanguage = detectedLang;
    } else {
      currentLanguage = "en";
    }
  };
  const setLanguageFromLocale = (locale) => {
    const normalized = normalizeLocale(locale);
    if (isSupportedLanguage(normalized)) {
      currentLanguage = normalized;
    } else {
      currentLanguage = "en";
    }
  };
  const t = (key) => {
    const langTrans = translations[currentLanguage];
    const enTrans = translations["en"];
    return langTrans?.[key] || enTrans?.[key] || key;
  };
  const DM_VIEW_CLASS = "mm-dm-view-active";
  const DM_VIEW_HAS_UNREAD_CLASS = "mm-dm-view-has-unread";
  const DM_VIEW_STORAGE_KEY = "mm-dm-view-state";
  const DM_GROUP_PREFIX = "direct_messages_";
  const UNREAD_GROUP_PREFIX = "unreads_";
  const DM_GROUP_HIDDEN_CLASS = "mm-dm-group-hidden";
  const DM_GROUP_SHOW_CLASS = "mm-dm-group-show";
  const DM_UNREAD_HIDDEN_CLASS = "mm-dm-unread-hidden";
  const DM_GROUP_NO_HEADER_CLASS = "mm-dm-group-no-header";
  const DM_GROUP_HIDE_ADD_CLASS = "mm-dm-group-hide-add";
  const UNREAD_DM_HIDDEN_CLASS = "mm-unread-dm-hidden";
  const UNREAD_EMPTY_CLASS = "mm-unread-empty";
  const DM_BADGE_STALE_MS = 1500;
  const DM_ICON_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(dmIconSvg)}`;
  const DM_FEATURE_ENABLED_CLASS = "mm-dm-feature-enabled";
  let dmSyncScheduled = false;
  let dmSyncInProgress = false;
  let dmIgnoreMutationsUntil = 0;
  let unreadFilterScheduled = false;
  let dmUnreadLastCount = 0;
  let dmUnreadLastUpdateAt = 0;
  let dmClickHandler = null;
  let dmKeydownHandler = null;
  let dmObserver = null;
  const setupDmPseudoTeam = (sidebar) => {
    window.addEventListener("mm-extension-setting-changed", (event) => {
      if (event.detail?.key === SETTING_DM_KEY) {
        updateFeatureState$1(sidebar);
      }
    });
    updateFeatureState$1(sidebar);
  };
  const updateFeatureState$1 = (sidebar) => {
    const enabled = isFeatureEnabled(SETTING_DM_KEY);
    if (!enabled) {
      teardownDmPseudoTeam(sidebar);
      return;
    }
    initDmPseudoTeam(sidebar);
  };
  const teardownDmPseudoTeam = (sidebar) => {
    const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS);
    if (droppable) {
      const item = droppable.querySelector(".mm-dm-team-item");
      if (item) item.remove();
      const divider = droppable.querySelector(".mm-dm-team-divider");
      if (divider) divider.remove();
      if (dmClickHandler) {
        droppable.removeEventListener("click", dmClickHandler);
        dmClickHandler = null;
      }
      if (dmKeydownHandler) {
        droppable.removeEventListener("keydown", dmKeydownHandler);
        dmKeydownHandler = null;
      }
      delete droppable.dataset.mmDmHandlersAttached;
    }
    if (dmObserver) {
      dmObserver.disconnect();
      dmObserver = null;
      delete document.documentElement.dataset.mmDmObserverAttached;
    }
    document.documentElement.classList.remove(DM_FEATURE_ENABLED_CLASS);
    setDmViewEnabled(false);
    const hiddenGroups = document.querySelectorAll(`.${DM_GROUP_HIDDEN_CLASS}`);
    hiddenGroups.forEach((el) => el.classList.remove(DM_GROUP_HIDDEN_CLASS));
    const shownGroups = document.querySelectorAll(`.${DM_GROUP_SHOW_CLASS}`);
    shownGroups.forEach((el) => el.classList.remove(DM_GROUP_SHOW_CLASS));
    const noHeaderGroups = document.querySelectorAll(`.${DM_GROUP_NO_HEADER_CLASS}`);
    noHeaderGroups.forEach((el) => el.classList.remove(DM_GROUP_NO_HEADER_CLASS));
    const hideAddGroups = document.querySelectorAll(`.${DM_GROUP_HIDE_ADD_CLASS}`);
    hideAddGroups.forEach((el) => el.classList.remove(DM_GROUP_HIDE_ADD_CLASS));
    const hiddenUnreadDms = document.querySelectorAll(`.${DM_UNREAD_HIDDEN_CLASS}`);
    hiddenUnreadDms.forEach((el) => el.classList.remove(DM_UNREAD_HIDDEN_CLASS));
    const hiddenUnreadItems = document.querySelectorAll(`.${UNREAD_DM_HIDDEN_CLASS}`);
    hiddenUnreadItems.forEach((el) => el.classList.remove(UNREAD_DM_HIDDEN_CLASS));
    const emptyUnreadGroups = document.querySelectorAll(`.${UNREAD_EMPTY_CLASS}`);
    emptyUnreadGroups.forEach((el) => el.classList.remove(UNREAD_EMPTY_CLASS));
    restoreGroupHeaders();
    const header = findTeamHeader();
    if (header) {
      if (header.dataset.mmOriginalTeamName) {
        header.textContent = header.dataset.mmOriginalTeamName;
        delete header.dataset.mmOriginalTeamName;
      }
      header.classList.remove("mm-dm-team-header-hidden");
      const toggleButton = findTeamHeaderButton(header);
      if (toggleButton && toggleButton.dataset.mmOriginalDisplay) {
        toggleButton.style.display = toggleButton.dataset.mmOriginalDisplay;
        delete toggleButton.dataset.mmOriginalDisplay;
      }
    }
    if (isDmViewEnabled()) {
      setDmViewEnabled(false);
    }
  };
  const initDmPseudoTeam = (sidebar) => {
    document.documentElement.classList.add(DM_FEATURE_ENABLED_CLASS);
    const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS);
    if (!droppable) return;
    let item = droppable.querySelector(".mm-dm-team-item");
    if (!item) {
      item = buildDmTeamItem();
      droppable.insertBefore(item, droppable.firstChild);
    }
    let divider = droppable.querySelector(".mm-dm-team-divider");
    if (!divider) {
      divider = document.createElement("div");
      divider.className = "mm-dm-team-divider";
      item.insertAdjacentElement("afterend", divider);
    }
    if (droppable.dataset.mmDmHandlersAttached !== "true") {
      droppable.dataset.mmDmHandlersAttached = "true";
      dmClickHandler = (event) => {
        const target = event.target?.closest(MM_SELECTORS.DRAGGABLE_TEAM_ITEM);
        if (!target) return;
        if (target.classList.contains("mm-dm-team-item")) {
          event.preventDefault();
          setDmViewEnabled(true);
          return;
        }
        if (isDmViewEnabled()) {
          setDmViewEnabled(false);
        }
      };
      dmKeydownHandler = (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const target = event.target?.closest(MM_SELECTORS.DRAGGABLE_TEAM_ITEM);
        if (!target || !target.classList.contains("mm-dm-team-item")) return;
        event.preventDefault();
        setDmViewEnabled(true);
      };
      droppable.addEventListener("click", dmClickHandler);
      droppable.addEventListener("keydown", dmKeydownHandler);
    }
    if (document.documentElement.dataset.mmDmObserverAttached !== "true") {
      document.documentElement.dataset.mmDmObserverAttached = "true";
      dmObserver = new MutationObserver(() => {
        if (dmSyncInProgress) return;
        if (Date.now() < dmIgnoreMutationsUntil) return;
        if (isDmViewEnabled()) {
          scheduleDmSync();
          return;
        }
        scheduleUnreadFilter();
      });
      dmObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    syncDmViewState();
  };
  const buildDmTeamItem = () => {
    const item = document.createElement("a");
    item.className = "draggable-team-container mm-dm-team-item";
    item.href = "#";
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", t("dm_item_aria_label"));
    item.tabIndex = 0;
    const teamContainer = document.createElement("div");
    teamContainer.className = "team-container";
    const teamBtn = document.createElement("div");
    teamBtn.className = "team-btn";
    const icon = document.createElement("div");
    icon.className = "TeamIcon TeamIcon__sm withImage";
    const iconContent = document.createElement("div");
    iconContent.className = "TeamIcon__content";
    const iconImage = document.createElement("div");
    iconImage.className = "TeamIcon__image TeamIcon__sm mm-dm-team-icon";
    iconImage.setAttribute("role", "img");
    iconImage.setAttribute("aria-label", t("dm_item_aria_label"));
    iconImage.style.backgroundImage = `url("${DM_ICON_DATA_URL}")`;
    iconContent.appendChild(iconImage);
    icon.appendChild(iconContent);
    teamBtn.appendChild(icon);
    teamContainer.appendChild(teamBtn);
    const badge = document.createElement("span");
    badge.className = "badge badge-max-number pull-right small mm-dm-unread-badge";
    teamContainer.appendChild(badge);
    const label = document.createElement("span");
    label.className = "mm-team-label";
    label.textContent = t("dm_item_label");
    item.appendChild(teamContainer);
    item.appendChild(label);
    return item;
  };
  const isDmViewEnabled = () => {
    return isFeatureEnabled(DM_VIEW_STORAGE_KEY);
  };
  const setDmViewEnabled = (enabled) => {
    setFeatureEnabled(DM_VIEW_STORAGE_KEY, enabled);
    syncDmViewState();
  };
  const syncDmViewState = () => {
    if (dmSyncInProgress) return;
    dmSyncInProgress = true;
    try {
      dmIgnoreMutationsUntil = Date.now() + 150;
      const enabled = isDmViewEnabled();
      document.documentElement.classList.toggle(DM_VIEW_CLASS, enabled);
      const item = document.querySelector(".mm-dm-team-item");
      if (item) {
        item.classList.toggle("mm-dm-team-active", enabled);
      }
      syncActiveTeamsForDm(enabled);
      if (!enabled) {
        resetDmViewState();
        syncUnreadFilterForTeams();
        updateDmHeader(false);
        return;
      }
      const unreadGroup = findSidebarGroupByPrefix(UNREAD_GROUP_PREFIX) ?? findSidebarGroupByHeaderText("unreads");
      const dmGroup = findSidebarGroupByPrefix(DM_GROUP_PREFIX);
      const badgeCount = countUnreadDmFromDmGroup(dmGroup);
      updateDmUnreadBadge(badgeCount, isDmGroupDataReady(dmGroup));
      const unreadDmCount = unreadGroup ? filterUnreadGroup(unreadGroup) : 0;
      const hasUnread = unreadDmCount > 0;
      document.documentElement.classList.toggle(DM_VIEW_HAS_UNREAD_CLASS, hasUnread);
      if (unreadGroup) {
        unreadGroup.classList.remove(UNREAD_EMPTY_CLASS);
        unreadGroup.classList.toggle(DM_GROUP_HIDDEN_CLASS, !hasUnread);
        unreadGroup.classList.toggle(DM_GROUP_SHOW_CLASS, hasUnread);
        setGroupHeaderText(unreadGroup, hasUnread ? t("unread_header") : null);
      }
      if (dmGroup) {
        dmGroup.classList.add(DM_GROUP_SHOW_CLASS);
        dmGroup.classList.toggle(DM_GROUP_NO_HEADER_CLASS, !hasUnread);
        dmGroup.classList.add(DM_GROUP_HIDE_ADD_CLASS);
        setGroupHeaderText(dmGroup, hasUnread ? t("dm_header") : null);
      }
      updateDmHeader(true);
    } finally {
      dmSyncInProgress = false;
    }
  };
  const scheduleDmSync = () => {
    if (dmSyncScheduled) return;
    dmSyncScheduled = true;
    window.requestAnimationFrame(() => {
      dmSyncScheduled = false;
      syncDmViewState();
    });
  };
  const scheduleUnreadFilter = () => {
    if (unreadFilterScheduled) return;
    unreadFilterScheduled = true;
    window.requestAnimationFrame(() => {
      unreadFilterScheduled = false;
      syncUnreadFilterForTeams();
    });
  };
  const updateDmHeader = (enabled) => {
    const header = findTeamHeader();
    if (!header) return;
    if (!header.dataset.mmOriginalTeamName && header.textContent) {
      header.dataset.mmOriginalTeamName = header.textContent;
    }
    const toggleButton = findTeamHeaderButton(header);
    if (toggleButton && !toggleButton.dataset.mmOriginalDisplay) {
      toggleButton.dataset.mmOriginalDisplay = toggleButton.style.display;
    }
    if (enabled) {
      header.classList.remove("mm-dm-team-header-hidden");
      header.textContent = t("dm_header");
      if (toggleButton) {
        if (toggleButton.style.display !== "none") {
          toggleButton.style.display = "none";
        }
      }
      return;
    }
    const original = header.dataset.mmOriginalTeamName;
    if (original) {
      if (header.textContent !== original) {
        header.textContent = original;
      }
    }
    if (toggleButton) {
      const nextDisplay = toggleButton.dataset.mmOriginalDisplay ?? "";
      if (toggleButton.style.display !== nextDisplay) {
        toggleButton.style.display = nextDisplay;
      }
    }
  };
  const syncActiveTeamsForDm = (enabled) => {
    const sidebar = findTeamSidebar();
    if (!sidebar) return;
    const items = Array.from(sidebar.querySelectorAll(MM_SELECTORS.DRAGGABLE_TEAM_ITEM));
    items.forEach((item) => {
      const container = item.querySelector(MM_SELECTORS.TEAM_CONTAINER);
      const icon = item.querySelector(".TeamIcon");
      if (item.classList.contains("mm-dm-team-item")) {
        const dmIcon = item.querySelector(".TeamIcon");
        if (enabled) {
          container?.classList.add("active");
          dmIcon?.classList.add("active");
        } else {
          container?.classList.remove("active");
          dmIcon?.classList.remove("active");
        }
        return;
      }
      if (enabled) {
        item.classList.remove("active");
        container?.classList.remove("active");
        icon?.classList.remove("active");
        return;
      }
    });
  };
  const resetDmViewState = () => {
    document.documentElement.classList.remove(DM_VIEW_HAS_UNREAD_CLASS);
    restoreGroupHeaders();
    const hiddenGroups = document.querySelectorAll(`.${DM_GROUP_HIDDEN_CLASS}`);
    hiddenGroups.forEach((group) => group.classList.remove(DM_GROUP_HIDDEN_CLASS));
    const shownGroups = document.querySelectorAll(`.${DM_GROUP_SHOW_CLASS}`);
    shownGroups.forEach((group) => group.classList.remove(DM_GROUP_SHOW_CLASS));
    const hiddenItems = document.querySelectorAll(`.${DM_UNREAD_HIDDEN_CLASS}`);
    hiddenItems.forEach((item) => item.classList.remove(DM_UNREAD_HIDDEN_CLASS));
    const noHeaderGroups = document.querySelectorAll(`.${DM_GROUP_NO_HEADER_CLASS}`);
    noHeaderGroups.forEach((group) => group.classList.remove(DM_GROUP_NO_HEADER_CLASS));
    const hideAddGroups = document.querySelectorAll(`.${DM_GROUP_HIDE_ADD_CLASS}`);
    hideAddGroups.forEach((group) => group.classList.remove(DM_GROUP_HIDE_ADD_CLASS));
  };
  const syncUnreadFilterForTeams = () => {
    dmIgnoreMutationsUntil = Date.now() + 150;
    if (isDmViewEnabled()) return;
    const unreadGroup = findSidebarGroupByPrefix(UNREAD_GROUP_PREFIX) ?? findSidebarGroupByHeaderText("unreads");
    const dmGroup = findSidebarGroupByPrefix(DM_GROUP_PREFIX);
    const dmDataReady = isDmGroupDataReady(dmGroup);
    if (!unreadGroup) {
      updateDmUnreadBadge(countUnreadDmFromDmGroup(dmGroup), dmDataReady);
      return;
    }
    let visibleCount = 0;
    const items = Array.from(unreadGroup.querySelectorAll("a"));
    items.forEach((item) => {
      const shouldHide = isDirectMessageLink(item);
      const container = findChannelListItem(item);
      if (shouldHide) {
        item.classList.add(UNREAD_DM_HIDDEN_CLASS);
        if (container) {
          container.classList.add(UNREAD_DM_HIDDEN_CLASS);
        }
      } else {
        item.classList.remove(UNREAD_DM_HIDDEN_CLASS);
        if (container) {
          container.classList.remove(UNREAD_DM_HIDDEN_CLASS);
        }
        visibleCount += 1;
      }
    });
    updateDmUnreadBadge(countUnreadDmFromDmGroup(dmGroup), dmDataReady);
    if (visibleCount === 0) {
      unreadGroup.classList.add(UNREAD_EMPTY_CLASS);
    } else {
      unreadGroup.classList.remove(UNREAD_EMPTY_CLASS);
    }
  };
  const findSidebarGroupByPrefix = (prefix) => {
    const direct = document.querySelector(`[data-rbd-draggable-id^="${prefix}"]`);
    if (direct) {
      return direct.classList.contains("SidebarChannelGroup") ? direct : direct.closest(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP);
    }
    const droppable = document.querySelector(`[data-rbd-droppable-id^="${prefix}"]`);
    return droppable?.closest(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP) ?? null;
  };
  const findSidebarGroupByHeaderText = (text) => {
    const nodes = Array.from(document.querySelectorAll(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP_HEADER_TEXT));
    const header = nodes.find((node) => node.textContent?.trim().toLowerCase() === text);
    return header?.closest(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP) ?? null;
  };
  const setGroupHeaderText = (group, title) => {
    const headerText = group.querySelector(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP_HEADER_TEXT);
    if (!headerText) return;
    if (headerText.dataset.mmOriginalHeaderText === void 0) {
      headerText.dataset.mmOriginalHeaderText = headerText.textContent ?? "";
    }
    if (title === null) {
      const original = headerText.dataset.mmOriginalHeaderText ?? "";
      if (headerText.textContent !== original) {
        headerText.textContent = original;
      }
      return;
    }
    if (headerText.textContent !== title) {
      headerText.textContent = title;
    }
  };
  const restoreGroupHeaders = () => {
    const headers = document.querySelectorAll(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP_HEADER_TEXT);
    headers.forEach((header) => {
      if (header.dataset.mmOriginalHeaderText !== void 0) {
        header.textContent = header.dataset.mmOriginalHeaderText;
        delete header.dataset.mmOriginalHeaderText;
      }
    });
  };
  const filterUnreadGroup = (group) => {
    const items = Array.from(group.querySelectorAll("a"));
    let dmCount = 0;
    items.forEach((item) => {
      const container = findChannelListItem(item);
      if (isDirectMessageLink(item)) {
        item.classList.remove(DM_UNREAD_HIDDEN_CLASS);
        item.classList.remove(UNREAD_DM_HIDDEN_CLASS);
        if (container) {
          container.classList.remove(DM_UNREAD_HIDDEN_CLASS);
          container.classList.remove(UNREAD_DM_HIDDEN_CLASS);
        }
        dmCount += 1;
        return;
      }
      item.classList.add(DM_UNREAD_HIDDEN_CLASS);
      if (container) {
        container.classList.add(DM_UNREAD_HIDDEN_CLASS);
      }
    });
    return dmCount;
  };
  const isDirectMessageLink = (link) => {
    const href = link.getAttribute("href") ?? "";
    return /\/messages\//.test(href);
  };
  const countUnreadDmFromDmGroup = (dmGroup) => {
    if (!dmGroup) return 0;
    const links = Array.from(dmGroup.querySelectorAll('a[href*="/messages/"]'));
    let count = 0;
    links.forEach((link) => {
      if (isUnreadDmLink(link)) {
        count += 1;
      }
    });
    return count;
  };
  const isUnreadDmLink = (link) => {
    const container = findChannelListItem(link);
    const className = `${link.className} ${container?.className ?? ""}`;
    if (/unread/i.test(className)) return true;
    const ariaLabel = link.getAttribute("aria-label")?.toLowerCase() ?? "";
    if (ariaLabel.includes("непрочитан")) return true;
    const badge = container?.querySelector(MM_SELECTORS.SIDEBAR_CHANNEL_BADGE);
    if (badge && !badge.classList.contains("mm-dm-unread-badge")) return true;
    return false;
  };
  const isDmGroupDataReady = (dmGroup) => {
    if (!dmGroup) return false;
    return dmGroup.querySelector('a[href*="/messages/"]') !== null;
  };
  const updateDmUnreadBadge = (count, isDataReady) => {
    const item = document.querySelector(".mm-dm-team-item");
    if (!item) return;
    const container = item.querySelector(MM_SELECTORS.TEAM_CONTAINER);
    if (!container) return;
    let badge = container.querySelector(".mm-dm-unread-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "badge badge-max-number pull-right small mm-dm-unread-badge";
      container.appendChild(badge);
    }
    if (count <= 0) {
      const now = Date.now();
      if (!isDataReady && dmUnreadLastCount > 0 && now - dmUnreadLastUpdateAt < DM_BADGE_STALE_MS) {
        return;
      }
      if (badge.textContent) {
        badge.textContent = "";
      }
      badge.classList.remove("mm-dm-unread-badge-visible");
      dmUnreadLastCount = 0;
      dmUnreadLastUpdateAt = now;
      return;
    }
    const nextText = count > 99 ? "99+" : `${count}`;
    if (badge.textContent !== nextText) {
      badge.textContent = nextText;
    }
    badge.classList.add("mm-dm-unread-badge-visible");
    dmUnreadLastCount = count;
    dmUnreadLastUpdateAt = Date.now();
  };
  const findChannelListItem = (link) => {
    return link.closest(MM_SELECTORS.CHANNEL_LIST_ITEM);
  };
  const findTeamHeader = () => {
    for (const selector of MM_SELECTORS.TEAM_HEADER) {
      const node = document.querySelector(selector);
      if (node) return node;
    }
    return null;
  };
  const findTeamHeaderButton = (header) => {
    const closestButton = header.closest("button");
    if (closestButton && closestButton.querySelector(MM_SELECTORS.ICON_CHEVRON_DOWN)) {
      return closestButton;
    }
    const wrapper = header.closest(".SidebarHeader") ?? header.parentElement;
    if (!wrapper) return null;
    const buttons = Array.from(wrapper.querySelectorAll("button"));
    return buttons.find((button) => button.querySelector(MM_SELECTORS.ICON_CHEVRON_DOWN)) ?? null;
  };
  const matterUiIcon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 32 32" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M16 2C8.28 2 2 8.28 2 16s6.28 14 14 14a1 1 0 0 0 1-1v-8h11.361a1 1 0 0 0 .951-.69c.453-1.39.685-2.845.688-4.308A1 1 0 0 0 30 16c0-7.72-6.28-14-14-14zm0 2c6.64 0 12 5.36 12 12 0 1.019-.22 2.017-.478 3H16a1 1 0 0 0-1 1v7.799C8.856 27.267 4 22.284 4 16 4 9.36 9.36 4 16 4z" fill="currentColor" opacity="1" data-original="#000000"></path><path d="M21.732 10.072a2 2 0 0 1-2.732.732 2 2 0 0 1-.732-2.732A2 2 0 0 1 21 7.34a2 2 0 0 1 .732 2.732zM10.804 13a2 2 0 0 1-2.732.732A2 2 0 0 1 7.34 11a2 2 0 0 1 2.732-.732A2 2 0 0 1 10.804 13zM24.245 15.861a2 2 0 0 1-2.45-1.414 2 2 0 0 1 1.415-2.45 2 2 0 0 1 2.45 1.415 2 2 0 0 1-1.415 2.45zM14.447 10.205a2 2 0 0 1-2.45-1.415 2 2 0 0 1 1.415-2.45 2 2 0 0 1 2.45 1.415 2 2 0 0 1-1.415 2.45z" fill="currentColor" opacity="1" data-original="#000000"></path></g></svg>';
  const setupExtensionSettings = () => {
    const observer = new MutationObserver(() => {
      const modal = document.querySelector(MM_SELECTORS.USER_SETTINGS_MODAL);
      if (modal) {
        injectMenuItem(modal);
        injectSettingsPanel(modal);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };
  const injectMenuItem = (modal) => {
    const tabList = modal.querySelector(MM_SELECTORS.TAB_LIST);
    if (!tabList) return;
    let pluginGroup = tabList.querySelector(MM_SELECTORS.PLUGIN_PREFERENCES_HEADER);
    if (!pluginGroup) {
      const lastGroup = tabList.lastElementChild;
      if (lastGroup) {
        pluginGroup = lastGroup;
      }
    }
    if (!pluginGroup) return;
    if (pluginGroup.querySelector(`#${EXTENSION_SETTINGS_BUTTON_ID}`)) return;
    const button = document.createElement("button");
    button.id = EXTENSION_SETTINGS_BUTTON_ID;
    button.className = "cursor--pointer style--none nav-pills__tab";
    button.setAttribute("aria-label", t("settings_title"));
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", "false");
    button.tabIndex = -1;
    button.setAttribute("aria-controls", EXTENSION_SETTINGS_TAB_ID);
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.innerHTML = matterUiIcon;
    icon.style.width = "16px";
    icon.style.height = "16px";
    icon.style.display = "inline-flex";
    icon.style.alignItems = "center";
    icon.style.justifyContent = "center";
    icon.style.verticalAlign = "middle";
    icon.style.marginRight = "8px";
    const svg = icon.querySelector("svg");
    if (svg) {
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.fill = "currentColor";
    }
    button.appendChild(icon);
    button.appendChild(document.createTextNode(t("settings_title")));
    button.addEventListener("click", (e) => {
      e.preventDefault();
      activateSettingsTab(modal);
    });
    tabList.addEventListener("click", (e) => {
      const target = e.target;
      const clickedTab = target.closest(MM_SELECTORS.NAV_PILLS_TAB);
      if (clickedTab && clickedTab.id !== EXTENSION_SETTINGS_BUTTON_ID) {
        const myTab = modal.querySelector(`#${EXTENSION_SETTINGS_BUTTON_ID}`);
        if (myTab) {
          myTab.classList.remove("active");
          myTab.setAttribute("aria-selected", "false");
        }
        const myPanel = modal.querySelector(`#${EXTENSION_SETTINGS_TAB_ID}`);
        if (myPanel) {
          myPanel.style.display = "none";
          myPanel.classList.add("hidden");
        }
      }
    });
    pluginGroup.appendChild(button);
  };
  const injectSettingsPanel = (modal) => {
    const contentContainer = modal.querySelector(MM_SELECTORS.SETTINGS_CONTENT);
    if (!contentContainer) return;
    if (contentContainer.querySelector(`#${EXTENSION_SETTINGS_TAB_ID}`)) return;
    const panel = document.createElement("div");
    panel.id = EXTENSION_SETTINGS_TAB_ID;
    panel.setAttribute("role", "tabpanel");
    panel.className = "hidden";
    panel.style.display = "none";
    const headerDiv = document.createElement("div");
    headerDiv.className = "modal-header";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close";
    closeBtn.dataset.dismiss = "modal";
    closeBtn.innerHTML = '<span aria-hidden="true">×</span>';
    const titleH4 = document.createElement("h4");
    titleH4.className = "modal-title";
    const backDiv = document.createElement("div");
    backDiv.className = "modal-back";
    backDiv.innerHTML = '<i class="fa fa-angle-left" aria-label="Значок сворачивания"></i>';
    const titleSpan = document.createElement("span");
    titleSpan.textContent = t("settings_header");
    titleH4.appendChild(backDiv);
    titleH4.appendChild(titleSpan);
    headerDiv.appendChild(closeBtn);
    headerDiv.appendChild(titleH4);
    panel.appendChild(headerDiv);
    const userSettingsDiv = document.createElement("div");
    userSettingsDiv.className = "user-settings";
    const desktopHeader = document.createElement("div");
    desktopHeader.className = "userSettingDesktopHeader";
    const headerH3 = document.createElement("h3");
    headerH3.className = "tab-header";
    headerH3.textContent = t("settings_header");
    desktopHeader.appendChild(headerH3);
    userSettingsDiv.appendChild(desktopHeader);
    const divider = document.createElement("div");
    divider.className = "divider-dark first";
    userSettingsDiv.appendChild(divider);
    userSettingsDiv.appendChild(createSettingRow(SETTING_RESIZER_KEY, t("setting_resizer_title"), t("setting_resizer_desc"), true));
    userSettingsDiv.appendChild(createDivider());
    userSettingsDiv.appendChild(createSettingRow(SETTING_DM_KEY, t("setting_dm_title"), t("setting_dm_desc"), false));
    userSettingsDiv.appendChild(createDivider());
    userSettingsDiv.appendChild(createSettingRow(SETTING_CALLS_KEY, t("setting_calls_title"), t("setting_calls_desc"), false));
    panel.appendChild(userSettingsDiv);
    contentContainer.appendChild(panel);
  };
  const createDivider = () => {
    const div = document.createElement("div");
    div.className = "divider-light";
    return div;
  };
  const activateSettingsTab = (modal) => {
    const tabs = modal.querySelectorAll(MM_SELECTORS.NAV_PILLS_TAB);
    tabs.forEach((tab) => {
      tab.classList.remove("active");
      tab.setAttribute("aria-selected", "false");
    });
    const ourTab = modal.querySelector(`#${EXTENSION_SETTINGS_BUTTON_ID}`);
    if (ourTab) {
      ourTab.classList.add("active");
      ourTab.setAttribute("aria-selected", "true");
    }
    const panels = modal.querySelectorAll('.settings-content div > div[role="tabpanel"]');
    panels.forEach((p) => {
      p.style.display = "none";
    });
    const ourPanel = modal.querySelector(`#${EXTENSION_SETTINGS_TAB_ID}`);
    if (ourPanel) {
      ourPanel.style.display = "block";
      ourPanel.classList.remove("hidden");
    }
  };
  const isEnabled = (key, defaultVal = false) => {
    return isFeatureEnabled(key, defaultVal);
  };
  const setEnabled = (key, val) => {
    setFeatureEnabled(key, val);
  };
  const createSettingRow = (key, title, desc, defaultVal) => {
    const container = document.createElement("div");
    const renderMin = () => {
      container.innerHTML = "";
      container.className = "section-min";
      const header = document.createElement("div");
      header.className = "secion-min__header";
      const h4 = document.createElement("h4");
      h4.className = "section-min__title";
      h4.textContent = title;
      const editBtn = document.createElement("button");
      editBtn.className = "color--link style--none section-min__edit";
      editBtn.innerHTML = '<i class="icon-pencil-outline" aria-hidden="true" title="Значок редактирования"></i><span>' + t("label_edit") + "</span>";
      editBtn.onclick = () => renderMax();
      header.appendChild(h4);
      header.appendChild(editBtn);
      const descDiv = document.createElement("div");
      descDiv.className = "section-min__describe";
      const enabled = isEnabled(key, defaultVal);
      descDiv.textContent = enabled ? t("label_on") : t("label_off");
      container.appendChild(header);
      container.appendChild(descDiv);
    };
    const renderMax = () => {
      container.innerHTML = "";
      container.className = "section-max form-horizontal";
      const h4 = document.createElement("h4");
      h4.className = "col-sm-12 section-title";
      h4.textContent = title;
      const contentDiv = document.createElement("div");
      contentDiv.className = "sectionContent col-sm-10 col-sm-offset-2";
      const listDiv = document.createElement("div");
      listDiv.className = "setting-list";
      const itemDiv = document.createElement("div");
      itemDiv.className = "setting-list-item";
      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.className = "form-legend hidden-label";
      legend.textContent = title;
      fieldset.appendChild(legend);
      const currentVal = isEnabled(key, defaultVal);
      let tempVal = currentVal;
      const createRadio = (val, labelText) => {
        const radioDiv = document.createElement("div");
        radioDiv.className = "radio";
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = key;
        input.checked = val === currentVal;
        input.onchange = () => {
          tempVal = val;
        };
        const span = document.createElement("span");
        span.textContent = labelText;
        label.appendChild(input);
        label.appendChild(span);
        radioDiv.appendChild(label);
        radioDiv.appendChild(document.createElement("br"));
        return radioDiv;
      };
      fieldset.appendChild(createRadio(true, t("label_on")));
      fieldset.appendChild(createRadio(false, t("label_off")));
      const descDiv = document.createElement("div");
      descDiv.className = "mt-5";
      descDiv.innerHTML = `<span>${desc}</span>`;
      fieldset.appendChild(descDiv);
      itemDiv.appendChild(fieldset);
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "setting-list-item";
      actionsDiv.appendChild(document.createElement("hr"));
      const saveBtn = document.createElement("button");
      saveBtn.className = "btn btn-primary";
      saveBtn.textContent = t("label_save");
      saveBtn.onclick = () => {
        setEnabled(key, tempVal);
        window.dispatchEvent(new CustomEvent("mm-extension-setting-changed", { detail: { key, value: tempVal } }));
        renderMin();
      };
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "btn btn-tertiary";
      cancelBtn.textContent = t("label_cancel");
      cancelBtn.onclick = () => renderMin();
      actionsDiv.appendChild(saveBtn);
      actionsDiv.appendChild(cancelBtn);
      listDiv.appendChild(itemDiv);
      listDiv.appendChild(actionsDiv);
      contentDiv.appendChild(listDiv);
      container.appendChild(h4);
      container.appendChild(contentDiv);
    };
    renderMin();
    return container;
  };
  const HIDE_CALLS_ENABLED_CLASS = "mm-hide-calls-enabled";
  const setupDisableCallButton = () => {
    window.addEventListener("mm-extension-setting-changed", (event) => {
      if (event.detail?.key === SETTING_CALLS_KEY) {
        updateFeatureState();
      }
    });
    updateFeatureState();
  };
  const updateFeatureState = () => {
    const enabled = isFeatureEnabled(SETTING_CALLS_KEY);
    if (enabled) {
      document.documentElement.classList.add(HIDE_CALLS_ENABLED_CLASS);
    } else {
      document.documentElement.classList.remove(HIDE_CALLS_ENABLED_CLASS);
    }
  };
  const teamNamesCache = /* @__PURE__ */ new Map();
  let teamNamesFetched = false;
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_end",
    async main() {
      if (!isMattermost()) return;
      await initLanguage();
      setupExtensionSettings();
      setupDisableCallButton();
      fetchTeamNames();
      const tryInit = () => {
        const sidebar = findTeamSidebar();
        if (!sidebar) return false;
        setupTeamLabels(sidebar);
        setupTeamSidebarResizer(sidebar);
        setupDmPseudoTeam(sidebar);
        return true;
      };
      if (tryInit()) return;
      const observer = new MutationObserver(() => {
        if (tryInit()) observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(() => observer.disconnect(), 1e4);
    }
  });
  const fetchTeamNames = async () => {
    if (teamNamesFetched) return;
    try {
      const response = await fetch("/api/v4/users/me/teams");
      if (response.ok) {
        const teams = await response.json();
        if (Array.isArray(teams)) {
          teams.forEach((team) => {
            if (team.id && team.display_name) {
              teamNamesCache.set(team.id, team.display_name);
            }
          });
          teamNamesFetched = true;
          const sidebar = findTeamSidebar();
          if (sidebar) {
            const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS);
            if (droppable) {
              const labels = droppable.querySelectorAll(".mm-team-label");
              labels.forEach((l) => l.remove());
              applyLabels(droppable);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch teams", e);
    }
  };
  const setupTeamLabels = (sidebar) => {
    const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS);
    if (!droppable) return;
    applyLabels(droppable);
    if (droppable.dataset.mmObserverAttached === "true") return;
    droppable.dataset.mmObserverAttached = "true";
    const observer = new MutationObserver(() => applyLabels(droppable));
    observer.observe(droppable, { childList: true, subtree: true });
  };
  const applyLabels = (droppable) => {
    const items = Array.from(droppable.querySelectorAll(MM_SELECTORS.DRAGGABLE_TEAM_ITEM));
    items.forEach((item) => {
      if (item.id === "select_teamTeamButton") return;
      if (item.querySelector(".mm-team-label")) return;
      const labelText = getTeamName(item);
      if (!labelText) return;
      const label = document.createElement("span");
      label.className = "mm-team-label";
      label.textContent = labelText;
      const teamContainer = item.querySelector(".team-container");
      if (teamContainer) {
        item.insertBefore(label, teamContainer.nextSibling);
      } else {
        item.appendChild(label);
      }
    });
  };
  const getTeamName = (item) => {
    if (item.id === "select_teamTeamButton") return null;
    const id = item.dataset.rbdDraggableId;
    if (id && teamNamesCache.has(id)) {
      return teamNamesCache.get(id);
    }
    const iconLabel = getTeamIconLabel(item);
    if (iconLabel) return iconLabel;
    const ariaLabel = item.getAttribute("aria-label");
    if (!ariaLabel) return null;
    let text = ariaLabel.trim();
    text = text.replace(/^команда\s+/i, "");
    text = text.replace(/\s+непрочитан\w*$/i, "");
    return text.trim() || null;
  };
  const getTeamIconLabel = (item) => {
    const icon = item.querySelector('[data-testid="teamIconImage"], [data-testid="teamIconInitial"]');
    const ariaLabel = icon?.getAttribute("aria-label")?.trim();
    if (!ariaLabel) return null;
    let match = ariaLabel.match(/команды\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();
    if (ariaLabel.endsWith(" Team Image")) {
      return ariaLabel.replace(/\s+Team Image$/, "").trim();
    }
    if (ariaLabel.endsWith(" Team Initials")) {
      return ariaLabel.replace(/\s+Team Initials$/, "").trim();
    }
    return ariaLabel;
  };
  function print$1(method, ...args) {
    if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
    else method("[wxt]", ...args);
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  var WxtLocationChangeEvent = class WxtLocationChangeEvent2 extends Event {
    static EVENT_NAME = getUniqueEventName("wxt:locationchange");
    constructor(newUrl, oldUrl) {
      super(WxtLocationChangeEvent2.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  function getUniqueEventName(eventName) {
    return `${browser?.runtime?.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return { run() {
      if (interval != null) return;
      oldUrl = new URL(location.href);
      interval = ctx.setInterval(() => {
        let newUrl = new URL(location.href);
        if (newUrl.href !== oldUrl.href) {
          window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
          oldUrl = newUrl;
        }
      }, 1e3);
    } };
  }
  var ContentScriptContext = class ContentScriptContext2 {
    static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName("wxt:content-script-started");
    isTopFrame = window.self === window.top;
    abortController;
    locationWatcher = createLocationWatcher(this);
    receivedMessageIds = /* @__PURE__ */ new Set();
    constructor(contentScriptName, options) {
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else this.listenForNewerScripts();
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime?.id == null) this.notifyInvalidated();
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
    * Add a listener that is called when the content script's context is invalidated.
    *
    * @returns A function to remove the listener.
    *
    * @example
    * browser.runtime.onMessage.addListener(cb);
    * const removeInvalidatedListener = ctx.onInvalidated(() => {
    *   browser.runtime.onMessage.removeListener(cb);
    * })
    * // ...
    * removeInvalidatedListener();
    */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
    * Return a promise that never resolves. Useful if you have an async function that shouldn't run
    * after the context is expired.
    *
    * @example
    * const getValueFromStorage = async () => {
    *   if (ctx.isInvalid) return ctx.block();
    *
    *   // ...
    * }
    */
    block() {
      return new Promise(() => {
      });
    }
    /**
    * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
    *
    * Intervals can be cleared by calling the normal `clearInterval` function.
    */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
    * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
    *
    * Timeouts can be cleared by calling the normal `setTimeout` function.
    */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
    * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
    * invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelAnimationFrame` function.
    */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
    * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
    * invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelIdleCallback` function.
    */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      target.addEventListener?.(type.startsWith("wxt:") ? getUniqueEventName(type) : type, handler, {
        ...options,
        signal: this.signal
      });
    }
    /**
    * @internal
    * Abort the abort controller and execute all `onInvalidated` listeners.
    */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(`Content script "${this.contentScriptName}" context invalidated`);
    }
    stopOldScripts() {
      window.postMessage({
        type: ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE,
        contentScriptName: this.contentScriptName,
        messageId: Math.random().toString(36).slice(2)
      }, "*");
    }
    verifyScriptStartedEvent(event) {
      const isScriptStartedEvent = event.data?.type === ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = event.data?.contentScriptName === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has(event.data?.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && options?.ignoreFirstEvent) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
    else method("[wxt]", ...args);
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      return await main(new ContentScriptContext("content", options));
    } catch (err) {
      logger.error(`The content script "${"content"}" crashed on startup!`, err);
      throw err;
    }
  })();
  return result;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L3NoYXJlZC9jb25zdGFudHMudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L3NoYXJlZC91dGlscy50cyIsIi4uLy4uLy4uL2VudHJ5cG9pbnRzL2NvbnRlbnQvZmVhdHVyZXMvZXh0ZW5zaW9uLXNldHRpbmdzL2NvbnN0YW50cy50cyIsIi4uLy4uLy4uL2VudHJ5cG9pbnRzL2NvbnRlbnQvZmVhdHVyZXMvdGVhbS1zaWRlYmFyLXJlc2l6ZXIvbG9naWMudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2ljb25zL2RpcmVjdF9tZXNzYWdlLnN2Zz9yYXciLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L3NoYXJlZC9zZWxlY3RvcnMudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L3NoYXJlZC9kb20udHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2ZlYXR1cmVzL211bHRpbGFuZ3VhZ2UvbG9naWMudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2ZlYXR1cmVzL2RtLXRlYW0vbG9naWMudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2ljb25zL21hdHRlcl91aS5zdmc/cmF3IiwiLi4vLi4vLi4vZW50cnlwb2ludHMvY29udGVudC9mZWF0dXJlcy9leHRlbnNpb24tc2V0dGluZ3MvbG9naWMudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2ZlYXR1cmVzL2Rpc2FibGUtY2FsbC1idXR0b24vbG9naWMudHMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50L2luZGV4LnRzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2xvZ2dlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2NvbnRlbnQtc2NyaXB0LWNvbnRleHQubWpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vI3JlZ2lvbiBzcmMvdXRpbHMvZGVmaW5lLWNvbnRlbnQtc2NyaXB0LnRzXG5mdW5jdGlvbiBkZWZpbmVDb250ZW50U2NyaXB0KGRlZmluaXRpb24pIHtcblx0cmV0dXJuIGRlZmluaXRpb247XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQ29udGVudFNjcmlwdCB9OyIsImV4cG9ydCBjb25zdCBURUFNX1NJREVCQVJfUkVTSVpFUl9JRCA9ICdtbS10ZWFtLXNpZGViYXItcmVzaXplcidcbmV4cG9ydCBjb25zdCBURUFNX1NJREVCQVJfRVhQQU5ERURfQ0xBU1MgPSAnbW0tdGVhbS1zaWRlYmFyLWV4cGFuZGVkJ1xuZXhwb3J0IGNvbnN0IFRFQU1fU0lERUJBUl9FWFBBTkRFRF9NSU5fV0lEVEggPSA1MlxuZXhwb3J0IGNvbnN0IFRFQU1fU0lERUJBUl9FWFBBTkRFRF9NQVhfV0lEVEggPSAyMzBcbmV4cG9ydCBjb25zdCBURUFNX1NJREVCQVJfRVhQQU5ERURfVEhSRVNIT0xEID0gNzBcbiIsImV4cG9ydCBjb25zdCBpc0ZlYXR1cmVFbmFibGVkID0gKGtleTogc3RyaW5nLCBkZWZhdWx0VmFsOiBib29sZWFuID0gZmFsc2UpID0+IHtcbiAgY29uc3QgdmFsID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KVxuICBpZiAodmFsID09PSBudWxsKSByZXR1cm4gZGVmYXVsdFZhbFxuICByZXR1cm4gdmFsID09PSAnMScgfHwgdmFsID09PSAndHJ1ZSdcbn1cblxuZXhwb3J0IGNvbnN0IHNldEZlYXR1cmVFbmFibGVkID0gKGtleTogc3RyaW5nLCB2YWw6IGJvb2xlYW4pID0+IHtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWwgPyAnMScgOiAnMCcpXG59XG5cbmV4cG9ydCBjb25zdCBpc01hdHRlcm1vc3QgPSAoKSA9PiB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpXG4gIGlmIChyb290KSB7XG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXR0ZXJtb3N0LXZpZXctY29udGFpbmVyJykpIHJldHVybiB0cnVlXG4gICAgaWYgKHJvb3QucXVlcnlTZWxlY3RvcignLmNoYW5uZWwtdmlldycpKSByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ21ldGFbbmFtZT1cImFwcGxpY2F0aW9uLW5hbWVcIl1bY29udGVudD1cIk1hdHRlcm1vc3RcIl0nKSkgcmV0dXJuIHRydWVcbiAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ21ldGFbbmFtZT1cImFwcGxlLW1vYmlsZS13ZWItYXBwLXRpdGxlXCJdW2NvbnRlbnQ9XCJNYXR0ZXJtb3N0XCJdJykpIHJldHVybiB0cnVlXG4gIFxuICBjb25zdCBub3NjcmlwdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ25vc2NyaXB0JylcbiAgaWYgKG5vc2NyaXB0Py50ZXh0Q29udGVudD8uaW5jbHVkZXMoJ01hdHRlcm1vc3QnKSkgcmV0dXJuIHRydWVcbiAgXG4gIHJldHVybiBmYWxzZVxufVxuIiwiZXhwb3J0IGNvbnN0IEVYVEVOU0lPTl9TRVRUSU5HU19UQUJfSUQgPSAnbWF0dGVyVWlTZXR0aW5ncydcbmV4cG9ydCBjb25zdCBFWFRFTlNJT05fU0VUVElOR1NfQlVUVE9OX0lEID0gJ21hdHRlclVpQnV0dG9uJ1xuXG5leHBvcnQgY29uc3QgU0VUVElOR19SRVNJWkVSX0tFWSA9ICdtbS10ZWFtLXNpZGViYXItcmVzaXplci1lbmFibGVkJ1xuZXhwb3J0IGNvbnN0IFNFVFRJTkdfRE1fS0VZID0gJ21tLWRtLXZpZXctZW5hYmxlZCdcbmV4cG9ydCBjb25zdCBTRVRUSU5HX0NBTExTX0tFWSA9ICdtbS1oaWRlLWNhbGxzLWVuYWJsZWQnXG4iLCJpbXBvcnQge1xuICBURUFNX1NJREVCQVJfRVhQQU5ERURfQ0xBU1MsXG4gIFRFQU1fU0lERUJBUl9FWFBBTkRFRF9NQVhfV0lEVEgsXG4gIFRFQU1fU0lERUJBUl9FWFBBTkRFRF9NSU5fV0lEVEgsXG4gIFRFQU1fU0lERUJBUl9FWFBBTkRFRF9USFJFU0hPTEQsXG4gIFRFQU1fU0lERUJBUl9SRVNJWkVSX0lEXG59IGZyb20gJy4uLy4uL3NoYXJlZC9jb25zdGFudHMnXG5pbXBvcnQge2lzRmVhdHVyZUVuYWJsZWR9IGZyb20gJy4uLy4uL3NoYXJlZC91dGlscydcbmltcG9ydCB7U0VUVElOR19SRVNJWkVSX0tFWX0gZnJvbSAnLi4vZXh0ZW5zaW9uLXNldHRpbmdzL2NvbnN0YW50cydcblxuY29uc3QgU1RPUkFHRV9LRVlfV0lEVEggPSAnbW0tdGVhbS1zaWRlYmFyLXdpZHRoJ1xuY29uc3QgQU5JTUFUSU9OX0RVUkFUSU9OX01TID0gMzAwXG5jb25zdCBBTklNQVRJTkdfQ0xBU1MgPSAnbW0tdGVhbS1zaWRlYmFyLWFuaW1hdGluZydcblxuXG5cbmNvbnN0IHVwZGF0ZUV4cGFuZGVkQ2xhc3MgPSAoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgb3ZlcnJpZGVXaWR0aD86IG51bWJlcikgPT4ge1xuICBjb25zdCB3aWR0aCA9IG92ZXJyaWRlV2lkdGggPz8gY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoXG4gIGNvbnN0IGV4cGFuZGVkID0gd2lkdGggPiBURUFNX1NJREVCQVJfRVhQQU5ERURfVEhSRVNIT0xEXG4gIGNvbnRhaW5lci5jbGFzc0xpc3QudG9nZ2xlKFRFQU1fU0lERUJBUl9FWFBBTkRFRF9DTEFTUywgZXhwYW5kZWQpXG59XG5cbmV4cG9ydCBjb25zdCBzZXR1cFRlYW1TaWRlYmFyUmVzaXplciA9IChjb250YWluZXI6IEhUTUxFbGVtZW50KSA9PiB7XG4gIC8vIFN1YnNjcmliZSB0byBzZXR0aW5ncyBjaGFuZ2VzXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtbS1leHRlbnNpb24tc2V0dGluZy1jaGFuZ2VkJywgKGV2ZW50OiBhbnkpID0+IHtcbiAgICBpZiAoZXZlbnQuZGV0YWlsPy5rZXkgPT09IFNFVFRJTkdfUkVTSVpFUl9LRVkpIHtcbiAgICAgIHVwZGF0ZUZlYXR1cmVTdGF0ZShjb250YWluZXIpXG4gICAgfVxuICB9KVxuICBcbiAgdXBkYXRlRmVhdHVyZVN0YXRlKGNvbnRhaW5lcilcbn1cblxuY29uc3QgdXBkYXRlRmVhdHVyZVN0YXRlID0gKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpID0+IHtcbiAgY29uc3QgZW5hYmxlZCA9IGlzRmVhdHVyZUVuYWJsZWQoU0VUVElOR19SRVNJWkVSX0tFWSwgdHJ1ZSlcbiAgXG4gIGlmICghZW5hYmxlZCkge1xuICAgIHRlYXJkb3duVGVhbVNpZGViYXJSZXNpemVyKGNvbnRhaW5lcilcbiAgICByZXR1cm5cbiAgfVxuICBcbiAgaW5pdFRlYW1TaWRlYmFyUmVzaXplcihjb250YWluZXIpXG59XG5cbmNvbnN0IHRlYXJkb3duVGVhbVNpZGViYXJSZXNpemVyID0gKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpID0+IHtcbiAgY29uc3QgaGFuZGxlID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoYCMke1RFQU1fU0lERUJBUl9SRVNJWkVSX0lEfWApXG4gIGlmIChoYW5kbGUpIGhhbmRsZS5yZW1vdmUoKVxuICBcbiAgLy8gUmVtb3ZlIGNsYXNzZXMgYW5kIHN0eWxlc1xuICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZShURUFNX1NJREVCQVJfRVhQQU5ERURfQ0xBU1MpXG4gIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKEFOSU1BVElOR19DTEFTUylcbiAgXG4gIC8vIFJlc2V0IHdpZHRoIHRvIGRlZmF1bHQgKG1pbi13aWR0aCB1c3VhbGx5IGRlZmluZXMgaXQgaW4gQ1NTLCBidXQgd2Ugc2V0IGlubGluZSBzdHlsZXMpXG4gIC8vIFdlIHNob3VsZCByZW1vdmUgaW5saW5lIHdpZHRoL21heFdpZHRoIHRvIGxldCBDU1MgdGFrZSBvdmVyXG4gIGNvbnRhaW5lci5zdHlsZS53aWR0aCA9ICcnXG4gIGNvbnRhaW5lci5zdHlsZS5tYXhXaWR0aCA9ICcnXG4gIGNvbnRhaW5lci5zdHlsZS5mbGV4ID0gJycgLy8gV2Ugc2V0IGZsZXg6IDAgMCBhdXRvXG4gIGNvbnRhaW5lci5zdHlsZS5taW5XaWR0aCA9ICcnIC8vIFdlIHNldCBtaW5XaWR0aCBiYXNlZCBvbiBpbml0aWFsXG4gIGNvbnRhaW5lci5zdHlsZS5wb3NpdGlvbiA9ICcnIC8vIFdlIG1pZ2h0IGhhdmUgc2V0IHJlbGF0aXZlXG59XG5cbmNvbnN0IGluaXRUZWFtU2lkZWJhclJlc2l6ZXIgPSAoY29udGFpbmVyOiBIVE1MRWxlbWVudCkgPT4ge1xuICBpZiAoY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoYCMke1RFQU1fU0lERUJBUl9SRVNJWkVSX0lEfWApKSByZXR1cm5cbiAgXG4gIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShjb250YWluZXIpXG4gIGlmIChzdHlsZS5wb3NpdGlvbiAhPT0gJ3JlbGF0aXZlJykge1xuICAgIGNvbnRhaW5lci5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSdcbiAgfVxuICBjb25zdCBpbml0aWFsV2lkdGggPSBjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGhcbiAgY29udGFpbmVyLnN0eWxlLmZsZXggPSAnMCAwIGF1dG8nXG4gIGNvbnRhaW5lci5zdHlsZS5taW5XaWR0aCA9IGAke01hdGgubWF4KFRFQU1fU0lERUJBUl9FWFBBTkRFRF9NSU5fV0lEVEgsIE1hdGgucm91bmQoaW5pdGlhbFdpZHRoKSl9cHhgXG4gIFxuICAvLyBSZXN0b3JlIHN0YXRlIGZyb20gbG9jYWxTdG9yYWdlXG4gIGNvbnN0IHNhdmVkV2lkdGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWV9XSURUSClcbiAgaWYgKHNhdmVkV2lkdGgpIHtcbiAgICBjb25zdCB3aWR0aCA9IHBhcnNlRmxvYXQoc2F2ZWRXaWR0aClcbiAgICBpZiAoIWlzTmFOKHdpZHRoKSkge1xuICAgICAgY29udGFpbmVyLnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgXG4gICAgICBjb250YWluZXIuc3R5bGUubWF4V2lkdGggPSBgJHt3aWR0aH1weGBcbiAgICB9XG4gIH1cbiAgXG4gIHVwZGF0ZUV4cGFuZGVkQ2xhc3MoY29udGFpbmVyKVxuXG4gIGNvbnN0IGhhbmRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGhhbmRsZS5pZCA9IFRFQU1fU0lERUJBUl9SRVNJWkVSX0lEXG4gIGhhbmRsZS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSdcbiAgaGFuZGxlLnN0eWxlLnRvcCA9ICcwJ1xuICBoYW5kbGUuc3R5bGUucmlnaHQgPSAnMCdcbiAgaGFuZGxlLnN0eWxlLndpZHRoID0gJzZweCdcbiAgaGFuZGxlLnN0eWxlLmhlaWdodCA9ICcxMDAlJ1xuICBoYW5kbGUuc3R5bGUuY3Vyc29yID0gJ2NvbC1yZXNpemUnXG4gIGhhbmRsZS5zdHlsZS56SW5kZXggPSAnOTk5OSdcbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKGhhbmRsZSlcblxuICBsZXQgaXNEcmFnZ2luZyA9IGZhbHNlXG4gIGxldCBzdGFydFggPSAwXG4gIGxldCBzdGFydFdpZHRoID0gMFxuXG4gIGNvbnN0IHNhdmVTdGF0ZSA9ICgpID0+IHtcbiAgICBjb25zdCB3aWR0aCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aFxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZX1dJRFRILCB3aWR0aC50b1N0cmluZygpKVxuICB9XG5cbiAgY29uc3Qgb25Nb3VzZU1vdmUgPSAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICBpZiAoIWlzRHJhZ2dpbmcpIHJldHVyblxuICAgIGNvbnN0IG1pbldpZHRoID0gcGFyc2VGbG9hdChjb250YWluZXIuc3R5bGUubWluV2lkdGgpIHx8IFRFQU1fU0lERUJBUl9FWFBBTkRFRF9NSU5fV0lEVEhcbiAgICBjb25zdCBuZXh0ID0gTWF0aC5taW4oXG4gICAgICBURUFNX1NJREVCQVJfRVhQQU5ERURfTUFYX1dJRFRILFxuICAgICAgTWF0aC5tYXgobWluV2lkdGgsIHN0YXJ0V2lkdGggKyAoZXZlbnQuY2xpZW50WCAtIHN0YXJ0WCkpXG4gICAgKVxuICAgIGNvbnRhaW5lci5zdHlsZS53aWR0aCA9IGAke25leHR9cHhgXG4gICAgY29udGFpbmVyLnN0eWxlLm1heFdpZHRoID0gYCR7bmV4dH1weGBcbiAgICB1cGRhdGVFeHBhbmRlZENsYXNzKGNvbnRhaW5lcilcbiAgfVxuXG4gIGNvbnN0IG9uTW91c2VVcCA9ICgpID0+IHtcbiAgICBpZiAoIWlzRHJhZ2dpbmcpIHJldHVyblxuICAgIGlzRHJhZ2dpbmcgPSBmYWxzZVxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuY3Vyc29yID0gJydcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnVzZXJTZWxlY3QgPSAnJ1xuICAgIHVwZGF0ZUV4cGFuZGVkQ2xhc3MoY29udGFpbmVyKVxuICAgIHNhdmVTdGF0ZSgpXG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG9uTW91c2VNb3ZlKVxuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25Nb3VzZVVwKVxuICB9XG5cbiAgaGFuZGxlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIChldmVudCkgPT4ge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICBpc0RyYWdnaW5nID0gdHJ1ZVxuICAgIHN0YXJ0WCA9IGV2ZW50LmNsaWVudFhcbiAgICBzdGFydFdpZHRoID0gY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoXG4gICAgZG9jdW1lbnQuYm9keS5zdHlsZS5jdXJzb3IgPSAnY29sLXJlc2l6ZSdcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnVzZXJTZWxlY3QgPSAnbm9uZSdcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25Nb3VzZU1vdmUpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBvbk1vdXNlVXApXG4gIH0pXG5cbiAgaGFuZGxlLmFkZEV2ZW50TGlzdGVuZXIoJ2RibGNsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgIGNvbnN0IGN1cnJlbnRXaWR0aCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aFxuICAgIGNvbnN0IGlzRXhwYW5kZWQgPSBjdXJyZW50V2lkdGggPiBURUFNX1NJREVCQVJfRVhQQU5ERURfVEhSRVNIT0xEXG4gICAgXG4gICAgbGV0IG5leHRXaWR0aDogbnVtYmVyXG4gICAgaWYgKGlzRXhwYW5kZWQpIHtcbiAgICAgIC8vIENvbGxhcHNlXG4gICAgICBuZXh0V2lkdGggPSBwYXJzZUZsb2F0KGNvbnRhaW5lci5zdHlsZS5taW5XaWR0aCkgfHwgVEVBTV9TSURFQkFSX0VYUEFOREVEX01JTl9XSURUSFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFeHBhbmQgdG8gbWF4XG4gICAgICBuZXh0V2lkdGggPSBURUFNX1NJREVCQVJfRVhQQU5ERURfTUFYX1dJRFRIXG4gICAgfVxuICAgIFxuICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKEFOSU1BVElOR19DTEFTUylcbiAgICBjb250YWluZXIuc3R5bGUud2lkdGggPSBgJHtuZXh0V2lkdGh9cHhgXG4gICAgY29udGFpbmVyLnN0eWxlLm1heFdpZHRoID0gYCR7bmV4dFdpZHRofXB4YFxuICAgIFxuICAgIC8vIElmIGV4cGFuZGluZzogYXBwbHkgY2xhc3MgaW1tZWRpYXRlbHkgc28gY29udGVudCBpcyB2aXNpYmxlIGR1cmluZyBhbmltYXRpb25cbiAgICBpZiAoIWlzRXhwYW5kZWQpIHtcbiAgICAgIHVwZGF0ZUV4cGFuZGVkQ2xhc3MoY29udGFpbmVyLCBuZXh0V2lkdGgpXG4gICAgfVxuICAgIFxuICAgIHNhdmVTdGF0ZSgpXG4gICAgXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZShBTklNQVRJTkdfQ0xBU1MpXG4gICAgICAvLyBJZiBjb2xsYXBzaW5nOiBhcHBseSBjbGFzcyBhZnRlciBhbmltYXRpb24gc28gY29udGVudCBzdGF5cyB2aXNpYmxlIHVudGlsIHRoZSBlbmRcbiAgICAgIGlmIChpc0V4cGFuZGVkKSB7XG4gICAgICAgIHVwZGF0ZUV4cGFuZGVkQ2xhc3MoY29udGFpbmVyLCBuZXh0V2lkdGgpXG4gICAgICB9XG4gICAgfSwgQU5JTUFUSU9OX0RVUkFUSU9OX01TKVxuICB9KVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgXCI8c3ZnIHhtbG5zPVxcXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1xcXCIgdmVyc2lvbj1cXFwiMS4xXFxcIiB4bWxuczp4bGluaz1cXFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1xcXCIgd2lkdGg9XFxcIjUxMlxcXCIgaGVpZ2h0PVxcXCI1MTJcXFwiIHg9XFxcIjBcXFwiIHk9XFxcIjBcXFwiIHZpZXdCb3g9XFxcIjAgMCA1NDguMjQ0IDU0OC4yNDRcXFwiIHN0eWxlPVxcXCJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUxMiA1MTJcXFwiIHhtbDpzcGFjZT1cXFwicHJlc2VydmVcXFwiIGNsYXNzPVxcXCJcXFwiPjxnPjxwYXRoIGZpbGwtcnVsZT1cXFwiZXZlbm9kZFxcXCIgZD1cXFwiTTM5Mi4xOSAxNTYuMDU0IDIxMS4yNjggMjgxLjY2NyAyMi4wMzIgMjE4LjU4QzguODIzIDIxNC4xNjgtLjA3NiAyMDEuNzc1IDAgMTg3Ljg1MmMuMDc3LTEzLjkyMyA5LjA3OC0yNi4yNCAyMi4zMzgtMzAuNDk4TDUwNi4xNSAxLjU0OWMxMS41LTMuNjk3IDI0LjEyMy0uNjYzIDMyLjY2NiA3Ljg4IDguNTQyIDguNTQzIDExLjU3NyAyMS4xNjUgNy44NzkgMzIuNjY2TDM5MC44OSA1MjUuOTA2Yy00LjI1OCAxMy4yNi0xNi41NzUgMjIuMjYxLTMwLjQ5OCAyMi4zMzgtMTMuOTIzLjA3Ni0yNi4zMTYtOC44MjMtMzAuNzI4LTIyLjAzMmwtNjMuMzkzLTE5MC4xNTN6XFxcIiBjbGlwLXJ1bGU9XFxcImV2ZW5vZGRcXFwiIGZpbGw9XFxcIiNmZmZmZmZcXFwiIG9wYWNpdHk9XFxcIjFcXFwiIGRhdGEtb3JpZ2luYWw9XFxcIiNmZmZmZmZcXFwiIGNsYXNzPVxcXCJcXFwiPjwvcGF0aD48L2c+PC9zdmc+XFxuXCIiLCIvLyBNYXR0ZXJtb3N0IHNwZWNpZmljIHNlbGVjdG9yc1xuZXhwb3J0IGNvbnN0IE1NX1NFTEVDVE9SUyA9IHtcbiAgLy8gVGVhbSBTaWRlYmFyXG4gIFRFQU1fU0lERUJBUjogJy50ZWFtLXNpZGViYXInLFxuICBEUk9QUEFCTEVfVEVBTVM6ICdbZGF0YS1yYmQtZHJvcHBhYmxlLWlkPVwibXlfdGVhbXNcIl0nLFxuICBEUkFHR0FCTEVfVEVBTV9JVEVNOiAnYS5kcmFnZ2FibGUtdGVhbS1jb250YWluZXInLFxuICBURUFNX0NPTlRBSU5FUjogJy50ZWFtLWNvbnRhaW5lcicsXG4gIFRFQU1fSUNPTjogJy5UZWFtSWNvbicsXG4gIFxuICAvLyBTaWRlYmFyIENoYW5uZWxzXG4gIFNJREVCQVJfQ0hBTk5FTF9HUk9VUDogJy5TaWRlYmFyQ2hhbm5lbEdyb3VwJyxcbiAgU0lERUJBUl9DSEFOTkVMX0dST1VQX0hFQURFUl9URVhUOiAnLlNpZGViYXJDaGFubmVsR3JvdXBIZWFkZXJfdGV4dCcsXG4gIENIQU5ORUxfTElTVF9JVEVNOiAnbGksIC5TaWRlYmFyQ2hhbm5lbCwgLlNpZGViYXJDaGFubmVsR3JvdXAnLFxuICBTSURFQkFSX0NIQU5ORUxfQkFER0U6ICcuYmFkZ2UsIC5TaWRlYmFyQ2hhbm5lbEJhZGdlLCAuU2lkZWJhckNoYW5uZWxCYWRnZV9faWNvbicsXG4gIFxuICAvLyBIZWFkZXJzXG4gIFRFQU1fSEVBREVSOiBbXG4gICAgJy50ZWFtX19uYW1lJyxcbiAgICAnLnNpZGViYXItaGVhZGVyX190aXRsZScsXG4gICAgJ1tkYXRhLXRlc3RpZD1cInRlYW1TaWRlYmFySGVhZGVyXCJdIC50ZWFtX19uYW1lJyxcbiAgICAnLlNpZGViYXJIZWFkZXIgLnRlYW1fX25hbWUnLFxuICAgICcuU2lkZWJhckhlYWRlciBoMScsXG4gICAgJ1tkYXRhLXRlc3RpZD1cInRlYW1TaWRlYmFySGVhZGVyXCJdIGgxJyxcbiAgICAnLnNpZGViYXJIZWFkZXJDb250YWluZXIgaDEnXG4gIF0sXG4gIElDT05fQ0hFVlJPTl9ET1dOOiAnLmljb24tY2hldnJvbi1kb3duJyxcbiAgXG4gIC8vIFNldHRpbmdzIE1vZGFsXG4gIFVTRVJfU0VUVElOR1NfTU9EQUw6ICcuVXNlclNldHRpbmdzTW9kYWwnLFxuICBUQUJfTElTVDogJyN0YWJMaXN0JyxcbiAgUExVR0lOX1BSRUZFUkVOQ0VTX0hFQURFUjogJ1thcmlhLWxhYmVsbGVkYnk9XCJ1c2VyU2V0dGluZ3NNb2RhbC5wbHVnaW5QcmVmZXJlbmNlcy5oZWFkZXJcIl0nLFxuICBTRVRUSU5HU19DT05URU5UOiAnLnNldHRpbmdzLWNvbnRlbnQgZGl2JyxcbiAgTkFWX1BJTExTX1RBQjogJy5uYXYtcGlsbHNfX3RhYicsXG4gIFxuICAvLyBDYWxsc1xuICBDQUxMU19KT0lOX0JVVFRPTjogJyNjYWxscy1qb2luLWJ1dHRvbicsXG4gIFxuICAvLyBEZXRlY3Rpb25cbiAgUk9PVDogJyNyb290JyxcbiAgVklFV19DT05UQUlORVI6ICcjbWF0dGVybW9zdC12aWV3LWNvbnRhaW5lcicsXG4gIENIQU5ORUxfVklFVzogJy5jaGFubmVsLXZpZXcnXG59XG4iLCJpbXBvcnQge01NX1NFTEVDVE9SU30gZnJvbSAnLi9zZWxlY3RvcnMnXG5cbmV4cG9ydCBjb25zdCBmaW5kVGVhbVNpZGViYXIgPSAoKSA9PiB7XG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihNTV9TRUxFQ1RPUlMuVEVBTV9TSURFQkFSKVxufVxuIiwiaW1wb3J0IHRyYW5zbGF0aW9uc0pzb24gZnJvbSAnLi90cmFuc2xhdGlvbnMuanNvbidcblxuLy8gU3VwcG9ydGVkIGxhbmd1YWdlcyBiYXNlZCBvbiBrZXlzIGluIHRyYW5zbGF0aW9ucy5qc29uXG5leHBvcnQgdHlwZSBMYW5ndWFnZSA9IGtleW9mIHR5cGVvZiB0cmFuc2xhdGlvbnNKc29uXG5cbi8vIFRyYW5zbGF0aW9uIGtleXNcbmV4cG9ydCB0eXBlIFRyYW5zbGF0aW9uS2V5ID0ga2V5b2YgdHlwZW9mIHRyYW5zbGF0aW9uc0pzb24ucnVcblxuLy8gVHJhbnNsYXRpb25zIG1hcFxuY29uc3QgdHJhbnNsYXRpb25zOiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiA9IHRyYW5zbGF0aW9uc0pzb25cblxubGV0IGN1cnJlbnRMYW5ndWFnZTogTGFuZ3VhZ2UgPSAnZW4nXG5cbi8vIEhlbHBlciB0byBjaGVjayBpZiBhIGxvY2FsZSBpcyBzdXBwb3J0ZWRcbmNvbnN0IGlzU3VwcG9ydGVkTGFuZ3VhZ2UgPSAobGFuZzogc3RyaW5nKTogbGFuZyBpcyBMYW5ndWFnZSA9PiB7XG4gIHJldHVybiBsYW5nIGluIHRyYW5zbGF0aW9uc1xufVxuXG4vLyBIZWxwZXIgdG8gbm9ybWFsaXplIGxvY2FsZSBzdHJpbmcgKGUuZy4gJ3J1LVJVJyAtPiAncnUnKVxuY29uc3Qgbm9ybWFsaXplTG9jYWxlID0gKGxvY2FsZTogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgaWYgKCFsb2NhbGUpIHJldHVybiAnZW4nXG4gIC8vIFRyeSBleGFjdCBtYXRjaFxuICBpZiAoaXNTdXBwb3J0ZWRMYW5ndWFnZShsb2NhbGUpKSByZXR1cm4gbG9jYWxlXG4gIC8vIFRyeSBmaXJzdCBwYXJ0IChlLmcuICdydScgZnJvbSAncnUtUlUnKVxuICBjb25zdCBwYXJ0ID0gbG9jYWxlLnNwbGl0KCctJylbMF1cbiAgaWYgKGlzU3VwcG9ydGVkTGFuZ3VhZ2UocGFydCkpIHJldHVybiBwYXJ0XG4gIHJldHVybiAnZW4nXG59XG5cbmV4cG9ydCBjb25zdCBpbml0TGFuZ3VhZ2UgPSBhc3luYyAoKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2FwaS92NC91c2Vycy9tZScpXG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpXG4gICAgICBpZiAoZGF0YSAmJiBkYXRhLmxvY2FsZSkge1xuICAgICAgICBzZXRMYW5ndWFnZUZyb21Mb2NhbGUoZGF0YS5sb2NhbGUpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGZldGNoIHVzZXIgbG9jYWxlJywgZSlcbiAgfVxuXG4gIC8vIEZhbGxiYWNrIHRvIEhUTUwgbGFuZyBvciBicm93c2VyIGxhbmd1YWdlXG4gIGNvbnN0IGh0bWxMYW5nID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmxhbmdcbiAgY29uc3QgYnJvd3NlckxhbmcgPSBuYXZpZ2F0b3IubGFuZ3VhZ2VcbiAgXG4gIC8vIFRyeSBIVE1MIGxhbmcgZmlyc3QsIHRoZW4gYnJvd3NlciBsYW5nXG4gIGNvbnN0IGRldGVjdGVkTGFuZyA9IG5vcm1hbGl6ZUxvY2FsZShodG1sTGFuZykgIT09ICdlbicgPyBub3JtYWxpemVMb2NhbGUoaHRtbExhbmcpIDogbm9ybWFsaXplTG9jYWxlKGJyb3dzZXJMYW5nKVxuICBcbiAgLy8gV2UgYWxyZWFkeSBub3JtYWxpemVkIGl0LCBidXQgbGV0J3MgZG91YmxlIGNoZWNrIGlmIGl0J3Mgc3VwcG9ydGVkLCBvdGhlcndpc2UgZGVmYXVsdCB0byAnZW4nXG4gIGlmIChpc1N1cHBvcnRlZExhbmd1YWdlKGRldGVjdGVkTGFuZykpIHtcbiAgICBjdXJyZW50TGFuZ3VhZ2UgPSBkZXRlY3RlZExhbmdcbiAgfSBlbHNlIHtcbiAgICBjdXJyZW50TGFuZ3VhZ2UgPSAnZW4nXG4gIH1cbn1cblxuY29uc3Qgc2V0TGFuZ3VhZ2VGcm9tTG9jYWxlID0gKGxvY2FsZTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVMb2NhbGUobG9jYWxlKVxuICBpZiAoaXNTdXBwb3J0ZWRMYW5ndWFnZShub3JtYWxpemVkKSkge1xuICAgIGN1cnJlbnRMYW5ndWFnZSA9IG5vcm1hbGl6ZWRcbiAgfSBlbHNlIHtcbiAgICBjdXJyZW50TGFuZ3VhZ2UgPSAnZW4nXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IHQgPSAoa2V5OiBUcmFuc2xhdGlvbktleSk6IHN0cmluZyA9PiB7XG4gIGNvbnN0IGxhbmdUcmFucyA9IHRyYW5zbGF0aW9uc1tjdXJyZW50TGFuZ3VhZ2VdXG4gIGNvbnN0IGVuVHJhbnMgPSB0cmFuc2xhdGlvbnNbJ2VuJ11cbiAgcmV0dXJuIGxhbmdUcmFucz8uW2tleV0gfHwgZW5UcmFucz8uW2tleV0gfHwga2V5XG59XG5cbmV4cG9ydCBjb25zdCBnZXRDdXJyZW50TGFuZ3VhZ2UgPSAoKTogTGFuZ3VhZ2UgPT4ge1xuICByZXR1cm4gY3VycmVudExhbmd1YWdlXG59XG4iLCJpbXBvcnQgZG1JY29uU3ZnIGZyb20gJy4uLy4uL2ljb25zL2RpcmVjdF9tZXNzYWdlLnN2Zz9yYXcnXG5pbXBvcnQge2ZpbmRUZWFtU2lkZWJhcn0gZnJvbSAnLi4vLi4vc2hhcmVkL2RvbSdcbmltcG9ydCB7TU1fU0VMRUNUT1JTfSBmcm9tICcuLi8uLi9zaGFyZWQvc2VsZWN0b3JzJ1xuaW1wb3J0IHtpc0ZlYXR1cmVFbmFibGVkLCBzZXRGZWF0dXJlRW5hYmxlZH0gZnJvbSAnLi4vLi4vc2hhcmVkL3V0aWxzJ1xuaW1wb3J0IHtTRVRUSU5HX0RNX0tFWX0gZnJvbSAnLi4vZXh0ZW5zaW9uLXNldHRpbmdzL2NvbnN0YW50cydcbmltcG9ydCB7dH0gZnJvbSAnLi4vbXVsdGlsYW5ndWFnZS9sb2dpYydcblxuY29uc3QgRE1fVklFV19DTEFTUyA9ICdtbS1kbS12aWV3LWFjdGl2ZSdcbmNvbnN0IERNX1ZJRVdfSEFTX1VOUkVBRF9DTEFTUyA9ICdtbS1kbS12aWV3LWhhcy11bnJlYWQnXG5jb25zdCBETV9WSUVXX1NUT1JBR0VfS0VZID0gJ21tLWRtLXZpZXctc3RhdGUnXG5jb25zdCBETV9HUk9VUF9QUkVGSVggPSAnZGlyZWN0X21lc3NhZ2VzXydcbmNvbnN0IFVOUkVBRF9HUk9VUF9QUkVGSVggPSAndW5yZWFkc18nXG5jb25zdCBETV9HUk9VUF9ISURERU5fQ0xBU1MgPSAnbW0tZG0tZ3JvdXAtaGlkZGVuJ1xuY29uc3QgRE1fR1JPVVBfU0hPV19DTEFTUyA9ICdtbS1kbS1ncm91cC1zaG93J1xuY29uc3QgRE1fVU5SRUFEX0hJRERFTl9DTEFTUyA9ICdtbS1kbS11bnJlYWQtaGlkZGVuJ1xuY29uc3QgRE1fR1JPVVBfTk9fSEVBREVSX0NMQVNTID0gJ21tLWRtLWdyb3VwLW5vLWhlYWRlcidcbmNvbnN0IERNX0dST1VQX0hJREVfQUREX0NMQVNTID0gJ21tLWRtLWdyb3VwLWhpZGUtYWRkJ1xuY29uc3QgVU5SRUFEX0RNX0hJRERFTl9DTEFTUyA9ICdtbS11bnJlYWQtZG0taGlkZGVuJ1xuY29uc3QgVU5SRUFEX0VNUFRZX0NMQVNTID0gJ21tLXVucmVhZC1lbXB0eSdcbmNvbnN0IERNX0JBREdFX1NUQUxFX01TID0gMTUwMFxuY29uc3QgRE1fSUNPTl9EQVRBX1VSTCA9IGBkYXRhOmltYWdlL3N2Zyt4bWw7dXRmOCwke2VuY29kZVVSSUNvbXBvbmVudChkbUljb25TdmcpfWBcbmNvbnN0IERNX0ZFQVRVUkVfRU5BQkxFRF9DTEFTUyA9ICdtbS1kbS1mZWF0dXJlLWVuYWJsZWQnXG5sZXQgZG1TeW5jU2NoZWR1bGVkID0gZmFsc2VcbmxldCBkbVN5bmNJblByb2dyZXNzID0gZmFsc2VcbmxldCBkbUlnbm9yZU11dGF0aW9uc1VudGlsID0gMFxubGV0IHVucmVhZEZpbHRlclNjaGVkdWxlZCA9IGZhbHNlXG5sZXQgZG1VbnJlYWRMYXN0Q291bnQgPSAwXG5sZXQgZG1VbnJlYWRMYXN0VXBkYXRlQXQgPSAwXG5cbi8vIExpc3RlbmVyIHJlZmVyZW5jZXMgZm9yIGNsZWFudXBcbmxldCBkbUNsaWNrSGFuZGxlcjogKChldmVudDogRXZlbnQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGxcbmxldCBkbUtleWRvd25IYW5kbGVyOiAoKGV2ZW50OiBLZXlib2FyZEV2ZW50KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsXG5sZXQgZG1PYnNlcnZlcjogTXV0YXRpb25PYnNlcnZlciB8IG51bGwgPSBudWxsXG5cbmV4cG9ydCBjb25zdCBzZXR1cERtUHNldWRvVGVhbSA9IChzaWRlYmFyOiBIVE1MRWxlbWVudCkgPT4ge1xuICAvLyBTdWJzY3JpYmUgdG8gc2V0dGluZ3MgY2hhbmdlc1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW0tZXh0ZW5zaW9uLXNldHRpbmctY2hhbmdlZCcsIChldmVudDogYW55KSA9PiB7XG4gICAgaWYgKGV2ZW50LmRldGFpbD8ua2V5ID09PSBTRVRUSU5HX0RNX0tFWSkge1xuICAgICAgdXBkYXRlRmVhdHVyZVN0YXRlKHNpZGViYXIpXG4gICAgfVxuICB9KVxuXG4gIC8vIEluaXRpYWwgY2hlY2tcbiAgdXBkYXRlRmVhdHVyZVN0YXRlKHNpZGViYXIpXG59XG5cbmNvbnN0IHVwZGF0ZUZlYXR1cmVTdGF0ZSA9IChzaWRlYmFyOiBIVE1MRWxlbWVudCkgPT4ge1xuICBjb25zdCBlbmFibGVkID0gaXNGZWF0dXJlRW5hYmxlZChTRVRUSU5HX0RNX0tFWSlcbiAgXG4gIGlmICghZW5hYmxlZCkge1xuICAgIHRlYXJkb3duRG1Qc2V1ZG9UZWFtKHNpZGViYXIpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpbml0RG1Qc2V1ZG9UZWFtKHNpZGViYXIpXG59XG5cbmNvbnN0IHRlYXJkb3duRG1Qc2V1ZG9UZWFtID0gKHNpZGViYXI6IEhUTUxFbGVtZW50KSA9PiB7XG4gIC8vIFJlbW92ZSBETSBpdGVtIGFuZCBkaXZpZGVyXG4gIGNvbnN0IGRyb3BwYWJsZSA9IHNpZGViYXIucXVlcnlTZWxlY3RvcihNTV9TRUxFQ1RPUlMuRFJPUFBBQkxFX1RFQU1TKSBhcyBIVE1MRWxlbWVudCB8IG51bGxcbiAgaWYgKGRyb3BwYWJsZSkge1xuICAgIGNvbnN0IGl0ZW0gPSBkcm9wcGFibGUucXVlcnlTZWxlY3RvcignLm1tLWRtLXRlYW0taXRlbScpXG4gICAgaWYgKGl0ZW0pIGl0ZW0ucmVtb3ZlKClcbiAgICBcbiAgICBjb25zdCBkaXZpZGVyID0gZHJvcHBhYmxlLnF1ZXJ5U2VsZWN0b3IoJy5tbS1kbS10ZWFtLWRpdmlkZXInKVxuICAgIGlmIChkaXZpZGVyKSBkaXZpZGVyLnJlbW92ZSgpXG4gICAgXG4gICAgLy8gQ2xlYW51cCBsaXN0ZW5lcnNcbiAgICBpZiAoZG1DbGlja0hhbmRsZXIpIHtcbiAgICAgIGRyb3BwYWJsZS5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGRtQ2xpY2tIYW5kbGVyKVxuICAgICAgZG1DbGlja0hhbmRsZXIgPSBudWxsXG4gICAgfVxuICAgIGlmIChkbUtleWRvd25IYW5kbGVyKSB7XG4gICAgICBkcm9wcGFibGUucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGRtS2V5ZG93bkhhbmRsZXIgYXMgRXZlbnRMaXN0ZW5lcilcbiAgICAgIGRtS2V5ZG93bkhhbmRsZXIgPSBudWxsXG4gICAgfVxuICAgIGRlbGV0ZSBkcm9wcGFibGUuZGF0YXNldC5tbURtSGFuZGxlcnNBdHRhY2hlZFxuICB9XG4gIFxuICAvLyBEaXNjb25uZWN0IG9ic2VydmVyXG4gIGlmIChkbU9ic2VydmVyKSB7XG4gICAgZG1PYnNlcnZlci5kaXNjb25uZWN0KClcbiAgICBkbU9ic2VydmVyID0gbnVsbFxuICAgIGRlbGV0ZSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5tbURtT2JzZXJ2ZXJBdHRhY2hlZFxuICB9XG4gIFxuICAvLyBSZW1vdmUgZmVhdHVyZSBlbmFibGVkIGNsYXNzXG4gIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKERNX0ZFQVRVUkVfRU5BQkxFRF9DTEFTUylcblxuICAvLyBSZXNldCB2aWV3IHN0YXRlXG4gIHNldERtVmlld0VuYWJsZWQoZmFsc2UpIC8vIFRoaXMgd2lsbCByZXNldCBjbGFzc2VzIGFuZCByZXN0b3JlIG9yaWdpbmFsIHZpZXdcbiAgXG4gIC8vIENsZWFudXAgYW55IHJlc2lkdWFsIGNsYXNzZXMgdGhhdCBtaWdodCBoaWRlIERNcyBvciBVbnJlYWRzXG4gIGNvbnN0IGhpZGRlbkdyb3VwcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke0RNX0dST1VQX0hJRERFTl9DTEFTU31gKVxuICBoaWRkZW5Hcm91cHMuZm9yRWFjaChlbCA9PiBlbC5jbGFzc0xpc3QucmVtb3ZlKERNX0dST1VQX0hJRERFTl9DTEFTUykpXG5cbiAgY29uc3Qgc2hvd25Hcm91cHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGAuJHtETV9HUk9VUF9TSE9XX0NMQVNTfWApXG4gIHNob3duR3JvdXBzLmZvckVhY2goZWwgPT4gZWwuY2xhc3NMaXN0LnJlbW92ZShETV9HUk9VUF9TSE9XX0NMQVNTKSlcblxuICBjb25zdCBub0hlYWRlckdyb3VwcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke0RNX0dST1VQX05PX0hFQURFUl9DTEFTU31gKVxuICBub0hlYWRlckdyb3Vwcy5mb3JFYWNoKGVsID0+IGVsLmNsYXNzTGlzdC5yZW1vdmUoRE1fR1JPVVBfTk9fSEVBREVSX0NMQVNTKSlcblxuICBjb25zdCBoaWRlQWRkR3JvdXBzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgLiR7RE1fR1JPVVBfSElERV9BRERfQ0xBU1N9YClcbiAgaGlkZUFkZEdyb3Vwcy5mb3JFYWNoKGVsID0+IGVsLmNsYXNzTGlzdC5yZW1vdmUoRE1fR1JPVVBfSElERV9BRERfQ0xBU1MpKVxuXG4gIGNvbnN0IGhpZGRlblVucmVhZERtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke0RNX1VOUkVBRF9ISURERU5fQ0xBU1N9YClcbiAgaGlkZGVuVW5yZWFkRG1zLmZvckVhY2goZWwgPT4gZWwuY2xhc3NMaXN0LnJlbW92ZShETV9VTlJFQURfSElEREVOX0NMQVNTKSlcblxuICBjb25zdCBoaWRkZW5VbnJlYWRJdGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke1VOUkVBRF9ETV9ISURERU5fQ0xBU1N9YClcbiAgaGlkZGVuVW5yZWFkSXRlbXMuZm9yRWFjaChlbCA9PiBlbC5jbGFzc0xpc3QucmVtb3ZlKFVOUkVBRF9ETV9ISURERU5fQ0xBU1MpKVxuICBcbiAgY29uc3QgZW1wdHlVbnJlYWRHcm91cHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGAuJHtVTlJFQURfRU1QVFlfQ0xBU1N9YClcbiAgZW1wdHlVbnJlYWRHcm91cHMuZm9yRWFjaChlbCA9PiBlbC5jbGFzc0xpc3QucmVtb3ZlKFVOUkVBRF9FTVBUWV9DTEFTUykpXG5cbiAgLy8gUmVzdG9yZSBoZWFkZXJzIGlmIHRoZXkgd2VyZSBtb2RpZmllZFxuICByZXN0b3JlR3JvdXBIZWFkZXJzKClcbiAgXG4gIC8vIFJlc3RvcmUgRE0gaGVhZGVyIGluIHRlYW0gdmlldyBpZiBtb2RpZmllZFxuICBjb25zdCBoZWFkZXIgPSBmaW5kVGVhbUhlYWRlcigpXG4gIGlmIChoZWFkZXIpIHtcbiAgICAgIGlmIChoZWFkZXIuZGF0YXNldC5tbU9yaWdpbmFsVGVhbU5hbWUpIHtcbiAgICAgICAgICBoZWFkZXIudGV4dENvbnRlbnQgPSBoZWFkZXIuZGF0YXNldC5tbU9yaWdpbmFsVGVhbU5hbWVcbiAgICAgICAgICBkZWxldGUgaGVhZGVyLmRhdGFzZXQubW1PcmlnaW5hbFRlYW1OYW1lXG4gICAgICB9XG4gICAgICBoZWFkZXIuY2xhc3NMaXN0LnJlbW92ZSgnbW0tZG0tdGVhbS1oZWFkZXItaGlkZGVuJylcbiAgICAgIGNvbnN0IHRvZ2dsZUJ1dHRvbiA9IGZpbmRUZWFtSGVhZGVyQnV0dG9uKGhlYWRlcilcbiAgICAgIGlmICh0b2dnbGVCdXR0b24gJiYgdG9nZ2xlQnV0dG9uLmRhdGFzZXQubW1PcmlnaW5hbERpc3BsYXkpIHtcbiAgICAgICAgICB0b2dnbGVCdXR0b24uc3R5bGUuZGlzcGxheSA9IHRvZ2dsZUJ1dHRvbi5kYXRhc2V0Lm1tT3JpZ2luYWxEaXNwbGF5XG4gICAgICAgICAgZGVsZXRlIHRvZ2dsZUJ1dHRvbi5kYXRhc2V0Lm1tT3JpZ2luYWxEaXNwbGF5XG4gICAgICB9XG4gIH1cblxuICAvLyBJZiBmZWF0dXJlIGlzIGRpc2FibGVkLCB3ZSBzaG91bGQgZGVmaW5pdGVseSBleGl0IHRoZSBETSB2aWV3IGlmIHdlIGFyZSBpbiBpdC5cbiAgaWYgKGlzRG1WaWV3RW5hYmxlZCgpKSB7XG4gICAgc2V0RG1WaWV3RW5hYmxlZChmYWxzZSlcbiAgfVxufVxuXG5jb25zdCBpbml0RG1Qc2V1ZG9UZWFtID0gKHNpZGViYXI6IEhUTUxFbGVtZW50KSA9PiB7XG4gIC8vIEFkZCBmZWF0dXJlIGVuYWJsZWQgY2xhc3NcbiAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5hZGQoRE1fRkVBVFVSRV9FTkFCTEVEX0NMQVNTKVxuICBcbiAgY29uc3QgZHJvcHBhYmxlID0gc2lkZWJhci5xdWVyeVNlbGVjdG9yKE1NX1NFTEVDVE9SUy5EUk9QUEFCTEVfVEVBTVMpIGFzIEhUTUxFbGVtZW50IHwgbnVsbFxuICBpZiAoIWRyb3BwYWJsZSkgcmV0dXJuXG4gIGxldCBpdGVtID0gZHJvcHBhYmxlLnF1ZXJ5U2VsZWN0b3I8SFRNTEFuY2hvckVsZW1lbnQ+KCcubW0tZG0tdGVhbS1pdGVtJylcbiAgaWYgKCFpdGVtKSB7XG4gICAgaXRlbSA9IGJ1aWxkRG1UZWFtSXRlbSgpXG4gICAgZHJvcHBhYmxlLmluc2VydEJlZm9yZShpdGVtLCBkcm9wcGFibGUuZmlyc3RDaGlsZClcbiAgfVxuICBsZXQgZGl2aWRlciA9IGRyb3BwYWJsZS5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignLm1tLWRtLXRlYW0tZGl2aWRlcicpXG4gIGlmICghZGl2aWRlcikge1xuICAgIGRpdmlkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIGRpdmlkZXIuY2xhc3NOYW1lID0gJ21tLWRtLXRlYW0tZGl2aWRlcidcbiAgICBpdGVtLmluc2VydEFkamFjZW50RWxlbWVudCgnYWZ0ZXJlbmQnLCBkaXZpZGVyKVxuICB9XG4gIFxuICBpZiAoZHJvcHBhYmxlLmRhdGFzZXQubW1EbUhhbmRsZXJzQXR0YWNoZWQgIT09ICd0cnVlJykge1xuICAgIGRyb3BwYWJsZS5kYXRhc2V0Lm1tRG1IYW5kbGVyc0F0dGFjaGVkID0gJ3RydWUnXG4gICAgXG4gICAgZG1DbGlja0hhbmRsZXIgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSAoZXZlbnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50IHwgbnVsbCk/LmNsb3Nlc3QoTU1fU0VMRUNUT1JTLkRSQUdHQUJMRV9URUFNX0lURU0pIGFzIEhUTUxBbmNob3JFbGVtZW50IHwgbnVsbFxuICAgICAgaWYgKCF0YXJnZXQpIHJldHVyblxuICAgICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ21tLWRtLXRlYW0taXRlbScpKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgc2V0RG1WaWV3RW5hYmxlZCh0cnVlKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGlmIChpc0RtVmlld0VuYWJsZWQoKSkge1xuICAgICAgICBzZXREbVZpZXdFbmFibGVkKGZhbHNlKVxuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBkbUtleWRvd25IYW5kbGVyID0gKGV2ZW50OiBhbnkpID0+IHtcbiAgICAgIGlmIChldmVudC5rZXkgIT09ICdFbnRlcicgJiYgZXZlbnQua2V5ICE9PSAnICcpIHJldHVyblxuICAgICAgY29uc3QgdGFyZ2V0ID0gKGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudCB8IG51bGwpPy5jbG9zZXN0KE1NX1NFTEVDVE9SUy5EUkFHR0FCTEVfVEVBTV9JVEVNKSBhcyBIVE1MQW5jaG9yRWxlbWVudCB8IG51bGxcbiAgICAgIGlmICghdGFyZ2V0IHx8ICF0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdtbS1kbS10ZWFtLWl0ZW0nKSkgcmV0dXJuXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBzZXREbVZpZXdFbmFibGVkKHRydWUpXG4gICAgfVxuICAgIFxuICAgIGRyb3BwYWJsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGRtQ2xpY2tIYW5kbGVyKVxuICAgIGRyb3BwYWJsZS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZG1LZXlkb3duSGFuZGxlcilcbiAgfVxuICBcbiAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0Lm1tRG1PYnNlcnZlckF0dGFjaGVkICE9PSAndHJ1ZScpIHtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5tbURtT2JzZXJ2ZXJBdHRhY2hlZCA9ICd0cnVlJ1xuICAgIGRtT2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoKSA9PiB7XG4gICAgICBpZiAoZG1TeW5jSW5Qcm9ncmVzcykgcmV0dXJuXG4gICAgICBpZiAoRGF0ZS5ub3coKSA8IGRtSWdub3JlTXV0YXRpb25zVW50aWwpIHJldHVyblxuICAgICAgaWYgKGlzRG1WaWV3RW5hYmxlZCgpKSB7XG4gICAgICAgIHNjaGVkdWxlRG1TeW5jKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBzY2hlZHVsZVVucmVhZEZpbHRlcigpXG4gICAgfSlcbiAgICBkbU9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCB7Y2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlfSlcbiAgfVxuICBzeW5jRG1WaWV3U3RhdGUoKVxufVxuXG5jb25zdCBidWlsZERtVGVhbUl0ZW0gPSAoKSA9PiB7XG4gIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJylcbiAgaXRlbS5jbGFzc05hbWUgPSAnZHJhZ2dhYmxlLXRlYW0tY29udGFpbmVyIG1tLWRtLXRlYW0taXRlbSdcbiAgaXRlbS5ocmVmID0gJyMnXG4gIGl0ZW0uc2V0QXR0cmlidXRlKCdyb2xlJywgJ2J1dHRvbicpXG4gIGl0ZW0uc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgdCgnZG1faXRlbV9hcmlhX2xhYmVsJykpXG4gIGl0ZW0udGFiSW5kZXggPSAwXG5cbiAgY29uc3QgdGVhbUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIHRlYW1Db250YWluZXIuY2xhc3NOYW1lID0gJ3RlYW0tY29udGFpbmVyJ1xuXG4gIGNvbnN0IHRlYW1CdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICB0ZWFtQnRuLmNsYXNzTmFtZSA9ICd0ZWFtLWJ0bidcblxuICBjb25zdCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgaWNvbi5jbGFzc05hbWUgPSAnVGVhbUljb24gVGVhbUljb25fX3NtIHdpdGhJbWFnZSdcblxuICBjb25zdCBpY29uQ29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGljb25Db250ZW50LmNsYXNzTmFtZSA9ICdUZWFtSWNvbl9fY29udGVudCdcblxuICBjb25zdCBpY29uSW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBpY29uSW1hZ2UuY2xhc3NOYW1lID0gJ1RlYW1JY29uX19pbWFnZSBUZWFtSWNvbl9fc20gbW0tZG0tdGVhbS1pY29uJ1xuICBpY29uSW1hZ2Uuc2V0QXR0cmlidXRlKCdyb2xlJywgJ2ltZycpXG4gIGljb25JbWFnZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCB0KCdkbV9pdGVtX2FyaWFfbGFiZWwnKSlcbiAgaWNvbkltYWdlLnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IGB1cmwoXCIke0RNX0lDT05fREFUQV9VUkx9XCIpYFxuXG4gIGljb25Db250ZW50LmFwcGVuZENoaWxkKGljb25JbWFnZSlcbiAgaWNvbi5hcHBlbmRDaGlsZChpY29uQ29udGVudClcbiAgdGVhbUJ0bi5hcHBlbmRDaGlsZChpY29uKVxuICB0ZWFtQ29udGFpbmVyLmFwcGVuZENoaWxkKHRlYW1CdG4pXG4gIGNvbnN0IGJhZGdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gIGJhZGdlLmNsYXNzTmFtZSA9ICdiYWRnZSBiYWRnZS1tYXgtbnVtYmVyIHB1bGwtcmlnaHQgc21hbGwgbW0tZG0tdW5yZWFkLWJhZGdlJ1xuICB0ZWFtQ29udGFpbmVyLmFwcGVuZENoaWxkKGJhZGdlKVxuXG4gIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gIGxhYmVsLmNsYXNzTmFtZSA9ICdtbS10ZWFtLWxhYmVsJ1xuICBsYWJlbC50ZXh0Q29udGVudCA9IHQoJ2RtX2l0ZW1fbGFiZWwnKVxuXG4gIGl0ZW0uYXBwZW5kQ2hpbGQodGVhbUNvbnRhaW5lcilcbiAgaXRlbS5hcHBlbmRDaGlsZChsYWJlbClcbiAgcmV0dXJuIGl0ZW1cbn1cblxuY29uc3QgaXNEbVZpZXdFbmFibGVkID0gKCkgPT4ge1xuICByZXR1cm4gaXNGZWF0dXJlRW5hYmxlZChETV9WSUVXX1NUT1JBR0VfS0VZKVxufVxuXG5jb25zdCBzZXREbVZpZXdFbmFibGVkID0gKGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgc2V0RmVhdHVyZUVuYWJsZWQoRE1fVklFV19TVE9SQUdFX0tFWSwgZW5hYmxlZClcbiAgc3luY0RtVmlld1N0YXRlKClcbn1cblxuY29uc3Qgc3luY0RtVmlld1N0YXRlID0gKCkgPT4ge1xuICBpZiAoZG1TeW5jSW5Qcm9ncmVzcykgcmV0dXJuXG4gIGRtU3luY0luUHJvZ3Jlc3MgPSB0cnVlXG4gIHRyeSB7XG4gICAgZG1JZ25vcmVNdXRhdGlvbnNVbnRpbCA9IERhdGUubm93KCkgKyAxNTBcbiAgICBjb25zdCBlbmFibGVkID0gaXNEbVZpZXdFbmFibGVkKClcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZShETV9WSUVXX0NMQVNTLCBlbmFibGVkKVxuICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yPEhUTUxBbmNob3JFbGVtZW50PignLm1tLWRtLXRlYW0taXRlbScpXG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIGl0ZW0uY2xhc3NMaXN0LnRvZ2dsZSgnbW0tZG0tdGVhbS1hY3RpdmUnLCBlbmFibGVkKVxuICAgIH1cbiAgICBzeW5jQWN0aXZlVGVhbXNGb3JEbShlbmFibGVkKVxuICAgIGlmICghZW5hYmxlZCkge1xuICAgICAgcmVzZXREbVZpZXdTdGF0ZSgpXG4gICAgICBzeW5jVW5yZWFkRmlsdGVyRm9yVGVhbXMoKVxuICAgICAgdXBkYXRlRG1IZWFkZXIoZmFsc2UpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgdW5yZWFkR3JvdXAgPSBmaW5kU2lkZWJhckdyb3VwQnlQcmVmaXgoVU5SRUFEX0dST1VQX1BSRUZJWCkgPz8gZmluZFNpZGViYXJHcm91cEJ5SGVhZGVyVGV4dCgndW5yZWFkcycpXG4gICAgY29uc3QgZG1Hcm91cCA9IGZpbmRTaWRlYmFyR3JvdXBCeVByZWZpeChETV9HUk9VUF9QUkVGSVgpXG4gICAgY29uc3QgYmFkZ2VDb3VudCA9IGNvdW50VW5yZWFkRG1Gcm9tRG1Hcm91cChkbUdyb3VwKVxuICAgIHVwZGF0ZURtVW5yZWFkQmFkZ2UoYmFkZ2VDb3VudCwgaXNEbUdyb3VwRGF0YVJlYWR5KGRtR3JvdXApKVxuICAgIGNvbnN0IHVucmVhZERtQ291bnQgPSB1bnJlYWRHcm91cCA/IGZpbHRlclVucmVhZEdyb3VwKHVucmVhZEdyb3VwKSA6IDBcbiAgICBjb25zdCBoYXNVbnJlYWQgPSB1bnJlYWREbUNvdW50ID4gMFxuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKERNX1ZJRVdfSEFTX1VOUkVBRF9DTEFTUywgaGFzVW5yZWFkKVxuICAgIGlmICh1bnJlYWRHcm91cCkge1xuICAgICAgdW5yZWFkR3JvdXAuY2xhc3NMaXN0LnJlbW92ZShVTlJFQURfRU1QVFlfQ0xBU1MpXG4gICAgICB1bnJlYWRHcm91cC5jbGFzc0xpc3QudG9nZ2xlKERNX0dST1VQX0hJRERFTl9DTEFTUywgIWhhc1VucmVhZClcbiAgICAgIHVucmVhZEdyb3VwLmNsYXNzTGlzdC50b2dnbGUoRE1fR1JPVVBfU0hPV19DTEFTUywgaGFzVW5yZWFkKVxuICAgICAgc2V0R3JvdXBIZWFkZXJUZXh0KHVucmVhZEdyb3VwLCBoYXNVbnJlYWQgPyB0KCd1bnJlYWRfaGVhZGVyJykgOiBudWxsKVxuICAgIH1cbiAgICBpZiAoZG1Hcm91cCkge1xuICAgICAgZG1Hcm91cC5jbGFzc0xpc3QuYWRkKERNX0dST1VQX1NIT1dfQ0xBU1MpXG4gICAgICBkbUdyb3VwLmNsYXNzTGlzdC50b2dnbGUoRE1fR1JPVVBfTk9fSEVBREVSX0NMQVNTLCAhaGFzVW5yZWFkKVxuICAgICAgZG1Hcm91cC5jbGFzc0xpc3QuYWRkKERNX0dST1VQX0hJREVfQUREX0NMQVNTKVxuICAgICAgc2V0R3JvdXBIZWFkZXJUZXh0KGRtR3JvdXAsIGhhc1VucmVhZCA/IHQoJ2RtX2hlYWRlcicpIDogbnVsbClcbiAgICB9XG4gICAgdXBkYXRlRG1IZWFkZXIodHJ1ZSlcbiAgfSBmaW5hbGx5IHtcbiAgICBkbVN5bmNJblByb2dyZXNzID0gZmFsc2VcbiAgfVxufVxuXG5jb25zdCBzY2hlZHVsZURtU3luYyA9ICgpID0+IHtcbiAgaWYgKGRtU3luY1NjaGVkdWxlZCkgcmV0dXJuXG4gIGRtU3luY1NjaGVkdWxlZCA9IHRydWVcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZG1TeW5jU2NoZWR1bGVkID0gZmFsc2VcbiAgICBzeW5jRG1WaWV3U3RhdGUoKVxuICB9KVxufVxuXG5jb25zdCBzY2hlZHVsZVVucmVhZEZpbHRlciA9ICgpID0+IHtcbiAgaWYgKHVucmVhZEZpbHRlclNjaGVkdWxlZCkgcmV0dXJuXG4gIHVucmVhZEZpbHRlclNjaGVkdWxlZCA9IHRydWVcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgdW5yZWFkRmlsdGVyU2NoZWR1bGVkID0gZmFsc2VcbiAgICBzeW5jVW5yZWFkRmlsdGVyRm9yVGVhbXMoKVxuICB9KVxufVxuXG5jb25zdCB1cGRhdGVEbUhlYWRlciA9IChlbmFibGVkOiBib29sZWFuKSA9PiB7XG4gIGNvbnN0IGhlYWRlciA9IGZpbmRUZWFtSGVhZGVyKClcbiAgaWYgKCFoZWFkZXIpIHJldHVyblxuICBpZiAoIWhlYWRlci5kYXRhc2V0Lm1tT3JpZ2luYWxUZWFtTmFtZSAmJiBoZWFkZXIudGV4dENvbnRlbnQpIHtcbiAgICBoZWFkZXIuZGF0YXNldC5tbU9yaWdpbmFsVGVhbU5hbWUgPSBoZWFkZXIudGV4dENvbnRlbnRcbiAgfVxuICBjb25zdCB0b2dnbGVCdXR0b24gPSBmaW5kVGVhbUhlYWRlckJ1dHRvbihoZWFkZXIpXG4gIGlmICh0b2dnbGVCdXR0b24gJiYgIXRvZ2dsZUJ1dHRvbi5kYXRhc2V0Lm1tT3JpZ2luYWxEaXNwbGF5KSB7XG4gICAgdG9nZ2xlQnV0dG9uLmRhdGFzZXQubW1PcmlnaW5hbERpc3BsYXkgPSB0b2dnbGVCdXR0b24uc3R5bGUuZGlzcGxheVxuICB9XG4gIGlmIChlbmFibGVkKSB7XG4gICAgaGVhZGVyLmNsYXNzTGlzdC5yZW1vdmUoJ21tLWRtLXRlYW0taGVhZGVyLWhpZGRlbicpXG4gICAgaGVhZGVyLnRleHRDb250ZW50ID0gdCgnZG1faGVhZGVyJylcbiAgICBpZiAodG9nZ2xlQnV0dG9uKSB7XG4gICAgICBpZiAodG9nZ2xlQnV0dG9uLnN0eWxlLmRpc3BsYXkgIT09ICdub25lJykge1xuICAgICAgICB0b2dnbGVCdXR0b24uc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm5cbiAgfVxuICBjb25zdCBvcmlnaW5hbCA9IGhlYWRlci5kYXRhc2V0Lm1tT3JpZ2luYWxUZWFtTmFtZVxuICBpZiAob3JpZ2luYWwpIHtcbiAgICBpZiAoaGVhZGVyLnRleHRDb250ZW50ICE9PSBvcmlnaW5hbCkge1xuICAgICAgaGVhZGVyLnRleHRDb250ZW50ID0gb3JpZ2luYWxcbiAgICB9XG4gIH1cbiAgaWYgKHRvZ2dsZUJ1dHRvbikge1xuICAgIGNvbnN0IG5leHREaXNwbGF5ID0gdG9nZ2xlQnV0dG9uLmRhdGFzZXQubW1PcmlnaW5hbERpc3BsYXkgPz8gJydcbiAgICBpZiAodG9nZ2xlQnV0dG9uLnN0eWxlLmRpc3BsYXkgIT09IG5leHREaXNwbGF5KSB7XG4gICAgICB0b2dnbGVCdXR0b24uc3R5bGUuZGlzcGxheSA9IG5leHREaXNwbGF5XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHN5bmNBY3RpdmVUZWFtc0ZvckRtID0gKGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgY29uc3Qgc2lkZWJhciA9IGZpbmRUZWFtU2lkZWJhcigpXG4gIGlmICghc2lkZWJhcikgcmV0dXJuXG4gIGNvbnN0IGl0ZW1zID0gQXJyYXkuZnJvbShzaWRlYmFyLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEFuY2hvckVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5EUkFHR0FCTEVfVEVBTV9JVEVNKSlcblxuICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgY29uc3QgY29udGFpbmVyID0gaXRlbS5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihNTV9TRUxFQ1RPUlMuVEVBTV9DT05UQUlORVIpXG4gICAgICBjb25zdCBpY29uID0gaXRlbS5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignLlRlYW1JY29uJylcbiAgICAgIGlmIChpdGVtLmNsYXNzTGlzdC5jb250YWlucygnbW0tZG0tdGVhbS1pdGVtJykpIHtcbiAgICAgICAgY29uc3QgZG1JY29uID0gaXRlbS5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignLlRlYW1JY29uJylcbiAgICAgIGlmIChlbmFibGVkKSB7XG4gICAgICAgIGNvbnRhaW5lcj8uY2xhc3NMaXN0LmFkZCgnYWN0aXZlJylcbiAgICAgICAgZG1JY29uPy5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGFpbmVyPy5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKVxuICAgICAgICBkbUljb24/LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKGVuYWJsZWQpIHtcbiAgICAgIGl0ZW0uY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJylcbiAgICAgIGNvbnRhaW5lcj8uY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJylcbiAgICAgIGljb24/LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH0pXG59XG5cbmNvbnN0IHJlc2V0RG1WaWV3U3RhdGUgPSAoKSA9PiB7XG4gIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKERNX1ZJRVdfSEFTX1VOUkVBRF9DTEFTUylcbiAgcmVzdG9yZUdyb3VwSGVhZGVycygpXG4gIGNvbnN0IGhpZGRlbkdyb3VwcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KGAuJHtETV9HUk9VUF9ISURERU5fQ0xBU1N9YClcbiAgaGlkZGVuR3JvdXBzLmZvckVhY2goKGdyb3VwKSA9PiBncm91cC5jbGFzc0xpc3QucmVtb3ZlKERNX0dST1VQX0hJRERFTl9DTEFTUykpXG4gIGNvbnN0IHNob3duR3JvdXBzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oYC4ke0RNX0dST1VQX1NIT1dfQ0xBU1N9YClcbiAgc2hvd25Hcm91cHMuZm9yRWFjaCgoZ3JvdXApID0+IGdyb3VwLmNsYXNzTGlzdC5yZW1vdmUoRE1fR1JPVVBfU0hPV19DTEFTUykpXG4gIGNvbnN0IGhpZGRlbkl0ZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oYC4ke0RNX1VOUkVBRF9ISURERU5fQ0xBU1N9YClcbiAgaGlkZGVuSXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4gaXRlbS5jbGFzc0xpc3QucmVtb3ZlKERNX1VOUkVBRF9ISURERU5fQ0xBU1MpKVxuICBjb25zdCBub0hlYWRlckdyb3VwcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KGAuJHtETV9HUk9VUF9OT19IRUFERVJfQ0xBU1N9YClcbiAgbm9IZWFkZXJHcm91cHMuZm9yRWFjaCgoZ3JvdXApID0+IGdyb3VwLmNsYXNzTGlzdC5yZW1vdmUoRE1fR1JPVVBfTk9fSEVBREVSX0NMQVNTKSlcbiAgY29uc3QgaGlkZUFkZEdyb3VwcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KGAuJHtETV9HUk9VUF9ISURFX0FERF9DTEFTU31gKVxuICBoaWRlQWRkR3JvdXBzLmZvckVhY2goKGdyb3VwKSA9PiBncm91cC5jbGFzc0xpc3QucmVtb3ZlKERNX0dST1VQX0hJREVfQUREX0NMQVNTKSlcbn1cblxuY29uc3Qgc3luY1VucmVhZEZpbHRlckZvclRlYW1zID0gKCkgPT4ge1xuICBkbUlnbm9yZU11dGF0aW9uc1VudGlsID0gRGF0ZS5ub3coKSArIDE1MFxuICBpZiAoaXNEbVZpZXdFbmFibGVkKCkpIHJldHVyblxuICBjb25zdCB1bnJlYWRHcm91cCA9IGZpbmRTaWRlYmFyR3JvdXBCeVByZWZpeChVTlJFQURfR1JPVVBfUFJFRklYKSA/PyBmaW5kU2lkZWJhckdyb3VwQnlIZWFkZXJUZXh0KCd1bnJlYWRzJylcbiAgY29uc3QgZG1Hcm91cCA9IGZpbmRTaWRlYmFyR3JvdXBCeVByZWZpeChETV9HUk9VUF9QUkVGSVgpXG4gIGNvbnN0IGRtRGF0YVJlYWR5ID0gaXNEbUdyb3VwRGF0YVJlYWR5KGRtR3JvdXApXG4gIGlmICghdW5yZWFkR3JvdXApIHtcbiAgICB1cGRhdGVEbVVucmVhZEJhZGdlKGNvdW50VW5yZWFkRG1Gcm9tRG1Hcm91cChkbUdyb3VwKSwgZG1EYXRhUmVhZHkpXG4gICAgcmV0dXJuXG4gIH1cbiAgbGV0IHZpc2libGVDb3VudCA9IDBcbiAgY29uc3QgaXRlbXMgPSBBcnJheS5mcm9tKHVucmVhZEdyb3VwLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEFuY2hvckVsZW1lbnQ+KCdhJykpXG4gIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICBjb25zdCBzaG91bGRIaWRlID0gaXNEaXJlY3RNZXNzYWdlTGluayhpdGVtKVxuICAgIGNvbnN0IGNvbnRhaW5lciA9IGZpbmRDaGFubmVsTGlzdEl0ZW0oaXRlbSlcbiAgICBpZiAoc2hvdWxkSGlkZSkge1xuICAgICAgaXRlbS5jbGFzc0xpc3QuYWRkKFVOUkVBRF9ETV9ISURERU5fQ0xBU1MpXG4gICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKFVOUkVBRF9ETV9ISURERU5fQ0xBU1MpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZW0uY2xhc3NMaXN0LnJlbW92ZShVTlJFQURfRE1fSElEREVOX0NMQVNTKVxuICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZShVTlJFQURfRE1fSElEREVOX0NMQVNTKVxuICAgICAgfVxuICAgICAgdmlzaWJsZUNvdW50ICs9IDFcbiAgICB9XG4gIH0pXG4gIHVwZGF0ZURtVW5yZWFkQmFkZ2UoY291bnRVbnJlYWREbUZyb21EbUdyb3VwKGRtR3JvdXApLCBkbURhdGFSZWFkeSlcbiAgaWYgKHZpc2libGVDb3VudCA9PT0gMCkge1xuICAgIHVucmVhZEdyb3VwLmNsYXNzTGlzdC5hZGQoVU5SRUFEX0VNUFRZX0NMQVNTKVxuICB9IGVsc2Uge1xuICAgIHVucmVhZEdyb3VwLmNsYXNzTGlzdC5yZW1vdmUoVU5SRUFEX0VNUFRZX0NMQVNTKVxuICB9XG59XG5cbmNvbnN0IGZpbmRTaWRlYmFyR3JvdXBCeVByZWZpeCA9IChwcmVmaXg6IHN0cmluZykgPT4ge1xuICBjb25zdCBkaXJlY3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1yYmQtZHJhZ2dhYmxlLWlkXj1cIiR7cHJlZml4fVwiXWApIGFzIEhUTUxFbGVtZW50IHwgbnVsbFxuICBpZiAoZGlyZWN0KSB7XG4gICAgcmV0dXJuIGRpcmVjdC5jbGFzc0xpc3QuY29udGFpbnMoJ1NpZGViYXJDaGFubmVsR3JvdXAnKSA/IGRpcmVjdCA6IGRpcmVjdC5jbG9zZXN0PEhUTUxFbGVtZW50PihNTV9TRUxFQ1RPUlMuU0lERUJBUl9DSEFOTkVMX0dST1VQKVxuICB9XG4gIGNvbnN0IGRyb3BwYWJsZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXJiZC1kcm9wcGFibGUtaWRePVwiJHtwcmVmaXh9XCJdYCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsXG4gIHJldHVybiBkcm9wcGFibGU/LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5TSURFQkFSX0NIQU5ORUxfR1JPVVApID8/IG51bGxcbn1cblxuY29uc3QgZmluZFNpZGViYXJHcm91cEJ5SGVhZGVyVGV4dCA9ICh0ZXh0OiBzdHJpbmcpID0+IHtcbiAgY29uc3Qgbm9kZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5TSURFQkFSX0NIQU5ORUxfR1JPVVBfSEVBREVSX1RFWFQpKVxuICBjb25zdCBoZWFkZXIgPSBub2Rlcy5maW5kKChub2RlKSA9PiBub2RlLnRleHRDb250ZW50Py50cmltKCkudG9Mb3dlckNhc2UoKSA9PT0gdGV4dClcbiAgcmV0dXJuIGhlYWRlcj8uY2xvc2VzdDxIVE1MRWxlbWVudD4oTU1fU0VMRUNUT1JTLlNJREVCQVJfQ0hBTk5FTF9HUk9VUCkgPz8gbnVsbFxufVxuXG5jb25zdCBzZXRHcm91cEhlYWRlclRleHQgPSAoZ3JvdXA6IEhUTUxFbGVtZW50LCB0aXRsZTogc3RyaW5nIHwgbnVsbCkgPT4ge1xuICBjb25zdCBoZWFkZXJUZXh0ID0gZ3JvdXAucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oTU1fU0VMRUNUT1JTLlNJREVCQVJfQ0hBTk5FTF9HUk9VUF9IRUFERVJfVEVYVClcbiAgaWYgKCFoZWFkZXJUZXh0KSByZXR1cm5cbiAgaWYgKGhlYWRlclRleHQuZGF0YXNldC5tbU9yaWdpbmFsSGVhZGVyVGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaGVhZGVyVGV4dC5kYXRhc2V0Lm1tT3JpZ2luYWxIZWFkZXJUZXh0ID0gaGVhZGVyVGV4dC50ZXh0Q29udGVudCA/PyAnJ1xuICB9XG4gIGlmICh0aXRsZSA9PT0gbnVsbCkge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gaGVhZGVyVGV4dC5kYXRhc2V0Lm1tT3JpZ2luYWxIZWFkZXJUZXh0ID8/ICcnXG4gICAgaWYgKGhlYWRlclRleHQudGV4dENvbnRlbnQgIT09IG9yaWdpbmFsKSB7XG4gICAgICBoZWFkZXJUZXh0LnRleHRDb250ZW50ID0gb3JpZ2luYWxcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKGhlYWRlclRleHQudGV4dENvbnRlbnQgIT09IHRpdGxlKSB7XG4gICAgaGVhZGVyVGV4dC50ZXh0Q29udGVudCA9IHRpdGxlXG4gIH1cbn1cblxuY29uc3QgcmVzdG9yZUdyb3VwSGVhZGVycyA9ICgpID0+IHtcbiAgY29uc3QgaGVhZGVycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5TSURFQkFSX0NIQU5ORUxfR1JPVVBfSEVBREVSX1RFWFQpXG4gIGhlYWRlcnMuZm9yRWFjaCgoaGVhZGVyKSA9PiB7XG4gICAgaWYgKGhlYWRlci5kYXRhc2V0Lm1tT3JpZ2luYWxIZWFkZXJUZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGhlYWRlci50ZXh0Q29udGVudCA9IGhlYWRlci5kYXRhc2V0Lm1tT3JpZ2luYWxIZWFkZXJUZXh0XG4gICAgICBkZWxldGUgaGVhZGVyLmRhdGFzZXQubW1PcmlnaW5hbEhlYWRlclRleHRcbiAgICB9XG4gIH0pXG59XG5cbmNvbnN0IGZpbHRlclVucmVhZEdyb3VwID0gKGdyb3VwOiBIVE1MRWxlbWVudCkgPT4ge1xuICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20oZ3JvdXAucXVlcnlTZWxlY3RvckFsbDxIVE1MQW5jaG9yRWxlbWVudD4oJ2EnKSlcbiAgbGV0IGRtQ291bnQgPSAwXG4gIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICBjb25zdCBjb250YWluZXIgPSBmaW5kQ2hhbm5lbExpc3RJdGVtKGl0ZW0pXG4gICAgaWYgKGlzRGlyZWN0TWVzc2FnZUxpbmsoaXRlbSkpIHtcbiAgICAgIGl0ZW0uY2xhc3NMaXN0LnJlbW92ZShETV9VTlJFQURfSElEREVOX0NMQVNTKVxuICAgICAgaXRlbS5jbGFzc0xpc3QucmVtb3ZlKFVOUkVBRF9ETV9ISURERU5fQ0xBU1MpXG4gICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKERNX1VOUkVBRF9ISURERU5fQ0xBU1MpXG4gICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKFVOUkVBRF9ETV9ISURERU5fQ0xBU1MpXG4gICAgICB9XG4gICAgICBkbUNvdW50ICs9IDFcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpdGVtLmNsYXNzTGlzdC5hZGQoRE1fVU5SRUFEX0hJRERFTl9DTEFTUylcbiAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChETV9VTlJFQURfSElEREVOX0NMQVNTKVxuICAgIH1cbiAgfSlcbiAgcmV0dXJuIGRtQ291bnRcbn1cblxuY29uc3QgaXNEaXJlY3RNZXNzYWdlTGluayA9IChsaW5rOiBIVE1MQW5jaG9yRWxlbWVudCkgPT4ge1xuICBjb25zdCBocmVmID0gbGluay5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSA/PyAnJ1xuICByZXR1cm4gL1xcL21lc3NhZ2VzXFwvLy50ZXN0KGhyZWYpXG59XG5cbmNvbnN0IGNvdW50VW5yZWFkRG1Gcm9tRG1Hcm91cCA9IChkbUdyb3VwOiBIVE1MRWxlbWVudCB8IG51bGwpID0+IHtcbiAgaWYgKCFkbUdyb3VwKSByZXR1cm4gMFxuICBjb25zdCBsaW5rcyA9IEFycmF5LmZyb20oZG1Hcm91cC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxBbmNob3JFbGVtZW50PignYVtocmVmKj1cIi9tZXNzYWdlcy9cIl0nKSlcbiAgbGV0IGNvdW50ID0gMFxuICBsaW5rcy5mb3JFYWNoKChsaW5rKSA9PiB7XG4gICAgaWYgKGlzVW5yZWFkRG1MaW5rKGxpbmspKSB7XG4gICAgICBjb3VudCArPSAxXG4gICAgfVxuICB9KVxuICByZXR1cm4gY291bnRcbn1cblxuY29uc3QgaXNVbnJlYWREbUxpbmsgPSAobGluazogSFRNTEFuY2hvckVsZW1lbnQpID0+IHtcbiAgY29uc3QgY29udGFpbmVyID0gZmluZENoYW5uZWxMaXN0SXRlbShsaW5rKVxuICBjb25zdCBjbGFzc05hbWUgPSBgJHtsaW5rLmNsYXNzTmFtZX0gJHtjb250YWluZXI/LmNsYXNzTmFtZSA/PyAnJ31gXG4gIGlmICgvdW5yZWFkL2kudGVzdChjbGFzc05hbWUpKSByZXR1cm4gdHJ1ZVxuICBjb25zdCBhcmlhTGFiZWwgPSBsaW5rLmdldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpPy50b0xvd2VyQ2FzZSgpID8/ICcnXG4gIGlmIChhcmlhTGFiZWwuaW5jbHVkZXMoJ9C90LXQv9GA0L7Rh9C40YLQsNC9JykpIHJldHVybiB0cnVlXG4gIGNvbnN0IGJhZGdlID0gY29udGFpbmVyPy5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihNTV9TRUxFQ1RPUlMuU0lERUJBUl9DSEFOTkVMX0JBREdFKVxuICBpZiAoYmFkZ2UgJiYgIWJhZGdlLmNsYXNzTGlzdC5jb250YWlucygnbW0tZG0tdW5yZWFkLWJhZGdlJykpIHJldHVybiB0cnVlXG4gIHJldHVybiBmYWxzZVxufVxuXG5jb25zdCBpc0RtR3JvdXBEYXRhUmVhZHkgPSAoZG1Hcm91cDogSFRNTEVsZW1lbnQgfCBudWxsKSA9PiB7XG4gIGlmICghZG1Hcm91cCkgcmV0dXJuIGZhbHNlXG4gIHJldHVybiBkbUdyb3VwLnF1ZXJ5U2VsZWN0b3IoJ2FbaHJlZio9XCIvbWVzc2FnZXMvXCJdJykgIT09IG51bGxcbn1cblxuY29uc3QgdXBkYXRlRG1VbnJlYWRCYWRnZSA9IChjb3VudDogbnVtYmVyLCBpc0RhdGFSZWFkeTogYm9vbGVhbikgPT4ge1xuICBjb25zdCBpdGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJy5tbS1kbS10ZWFtLWl0ZW0nKVxuICBpZiAoIWl0ZW0pIHJldHVyblxuICBjb25zdCBjb250YWluZXIgPSBpdGVtLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5URUFNX0NPTlRBSU5FUilcbiAgaWYgKCFjb250YWluZXIpIHJldHVyblxuICBsZXQgYmFkZ2UgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJy5tbS1kbS11bnJlYWQtYmFkZ2UnKVxuICBpZiAoIWJhZGdlKSB7XG4gICAgYmFkZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICBiYWRnZS5jbGFzc05hbWUgPSAnYmFkZ2UgYmFkZ2UtbWF4LW51bWJlciBwdWxsLXJpZ2h0IHNtYWxsIG1tLWRtLXVucmVhZC1iYWRnZSdcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYmFkZ2UpXG4gIH1cbiAgaWYgKGNvdW50IDw9IDApIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpXG4gICAgaWYgKCFpc0RhdGFSZWFkeSAmJiBkbVVucmVhZExhc3RDb3VudCA+IDAgJiYgbm93IC0gZG1VbnJlYWRMYXN0VXBkYXRlQXQgPCBETV9CQURHRV9TVEFMRV9NUykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmIChiYWRnZS50ZXh0Q29udGVudCkge1xuICAgICAgYmFkZ2UudGV4dENvbnRlbnQgPSAnJ1xuICAgIH1cbiAgICBiYWRnZS5jbGFzc0xpc3QucmVtb3ZlKCdtbS1kbS11bnJlYWQtYmFkZ2UtdmlzaWJsZScpXG4gICAgZG1VbnJlYWRMYXN0Q291bnQgPSAwXG4gICAgZG1VbnJlYWRMYXN0VXBkYXRlQXQgPSBub3dcbiAgICByZXR1cm5cbiAgfVxuICBjb25zdCBuZXh0VGV4dCA9IGNvdW50ID4gOTkgPyAnOTkrJyA6IGAke2NvdW50fWBcbiAgaWYgKGJhZGdlLnRleHRDb250ZW50ICE9PSBuZXh0VGV4dCkge1xuICAgIGJhZGdlLnRleHRDb250ZW50ID0gbmV4dFRleHRcbiAgfVxuICBiYWRnZS5jbGFzc0xpc3QuYWRkKCdtbS1kbS11bnJlYWQtYmFkZ2UtdmlzaWJsZScpXG4gIGRtVW5yZWFkTGFzdENvdW50ID0gY291bnRcbiAgZG1VbnJlYWRMYXN0VXBkYXRlQXQgPSBEYXRlLm5vdygpXG59XG5cbmNvbnN0IGZpbmRDaGFubmVsTGlzdEl0ZW0gPSAobGluazogSFRNTEFuY2hvckVsZW1lbnQpID0+IHtcbiAgcmV0dXJuIGxpbmsuY2xvc2VzdDxIVE1MRWxlbWVudD4oTU1fU0VMRUNUT1JTLkNIQU5ORUxfTElTVF9JVEVNKVxufVxuXG5jb25zdCBmaW5kVGVhbUhlYWRlciA9ICgpID0+IHtcbiAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBNTV9TRUxFQ1RPUlMuVEVBTV9IRUFERVIpIHtcbiAgICBjb25zdCBub2RlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikgYXMgSFRNTEVsZW1lbnQgfCBudWxsXG4gICAgaWYgKG5vZGUpIHJldHVybiBub2RlXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuY29uc3QgZmluZFRlYW1IZWFkZXJCdXR0b24gPSAoaGVhZGVyOiBIVE1MRWxlbWVudCkgPT4ge1xuICBjb25zdCBjbG9zZXN0QnV0dG9uID0gaGVhZGVyLmNsb3Nlc3QoJ2J1dHRvbicpXG4gIGlmIChjbG9zZXN0QnV0dG9uICYmIGNsb3Nlc3RCdXR0b24ucXVlcnlTZWxlY3RvcihNTV9TRUxFQ1RPUlMuSUNPTl9DSEVWUk9OX0RPV04pKSB7XG4gICAgcmV0dXJuIGNsb3Nlc3RCdXR0b24gYXMgSFRNTEJ1dHRvbkVsZW1lbnRcbiAgfVxuICBjb25zdCB3cmFwcGVyID0gaGVhZGVyLmNsb3Nlc3QoJy5TaWRlYmFySGVhZGVyJykgPz8gaGVhZGVyLnBhcmVudEVsZW1lbnRcbiAgaWYgKCF3cmFwcGVyKSByZXR1cm4gbnVsbFxuICBjb25zdCBidXR0b25zID0gQXJyYXkuZnJvbSh3cmFwcGVyLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEJ1dHRvbkVsZW1lbnQ+KCdidXR0b24nKSlcbiAgcmV0dXJuIGJ1dHRvbnMuZmluZCgoYnV0dG9uKSA9PiBidXR0b24ucXVlcnlTZWxlY3RvcihNTV9TRUxFQ1RPUlMuSUNPTl9DSEVWUk9OX0RPV04pKSA/PyBudWxsXG59XG4iLCJleHBvcnQgZGVmYXVsdCBcIjxzdmcgeG1sbnM9XFxcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXFxcIiB2ZXJzaW9uPVxcXCIxLjFcXFwiIHhtbG5zOnhsaW5rPVxcXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXFxcIiB3aWR0aD1cXFwiNTEyXFxcIiBoZWlnaHQ9XFxcIjUxMlxcXCIgeD1cXFwiMFxcXCIgeT1cXFwiMFxcXCIgdmlld0JveD1cXFwiMCAwIDMyIDMyXFxcIiBzdHlsZT1cXFwiZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyXFxcIiB4bWw6c3BhY2U9XFxcInByZXNlcnZlXFxcIiBjbGFzcz1cXFwiXFxcIj48Zz48cGF0aCBkPVxcXCJNMTYgMkM4LjI4IDIgMiA4LjI4IDIgMTZzNi4yOCAxNCAxNCAxNGExIDEgMCAwIDAgMS0xdi04aDExLjM2MWExIDEgMCAwIDAgLjk1MS0uNjljLjQ1My0xLjM5LjY4NS0yLjg0NS42ODgtNC4zMDhBMSAxIDAgMCAwIDMwIDE2YzAtNy43Mi02LjI4LTE0LTE0LTE0em0wIDJjNi42NCAwIDEyIDUuMzYgMTIgMTIgMCAxLjAxOS0uMjIgMi4wMTctLjQ3OCAzSDE2YTEgMSAwIDAgMC0xIDF2Ny43OTlDOC44NTYgMjcuMjY3IDQgMjIuMjg0IDQgMTYgNCA5LjM2IDkuMzYgNCAxNiA0elxcXCIgZmlsbD1cXFwiY3VycmVudENvbG9yXFxcIiBvcGFjaXR5PVxcXCIxXFxcIiBkYXRhLW9yaWdpbmFsPVxcXCIjMDAwMDAwXFxcIj48L3BhdGg+PHBhdGggZD1cXFwiTTIxLjczMiAxMC4wNzJhMiAyIDAgMCAxLTIuNzMyLjczMiAyIDIgMCAwIDEtLjczMi0yLjczMkEyIDIgMCAwIDEgMjEgNy4zNGEyIDIgMCAwIDEgLjczMiAyLjczMnpNMTAuODA0IDEzYTIgMiAwIDAgMS0yLjczMi43MzJBMiAyIDAgMCAxIDcuMzQgMTFhMiAyIDAgMCAxIDIuNzMyLS43MzJBMiAyIDAgMCAxIDEwLjgwNCAxM3pNMjQuMjQ1IDE1Ljg2MWEyIDIgMCAwIDEtMi40NS0xLjQxNCAyIDIgMCAwIDEgMS40MTUtMi40NSAyIDIgMCAwIDEgMi40NSAxLjQxNSAyIDIgMCAwIDEtMS40MTUgMi40NXpNMTQuNDQ3IDEwLjIwNWEyIDIgMCAwIDEtMi40NS0xLjQxNSAyIDIgMCAwIDEgMS40MTUtMi40NSAyIDIgMCAwIDEgMi40NSAxLjQxNSAyIDIgMCAwIDEtMS40MTUgMi40NXpcXFwiIGZpbGw9XFxcImN1cnJlbnRDb2xvclxcXCIgb3BhY2l0eT1cXFwiMVxcXCIgZGF0YS1vcmlnaW5hbD1cXFwiIzAwMDAwMFxcXCI+PC9wYXRoPjwvZz48L3N2Zz5cIiIsImltcG9ydCBtYXR0ZXJVaUljb24gZnJvbSAnLi4vLi4vaWNvbnMvbWF0dGVyX3VpLnN2Zz9yYXcnXG5pbXBvcnQge01NX1NFTEVDVE9SU30gZnJvbSAnLi4vLi4vc2hhcmVkL3NlbGVjdG9ycydcbmltcG9ydCB7aXNGZWF0dXJlRW5hYmxlZCwgc2V0RmVhdHVyZUVuYWJsZWR9IGZyb20gJy4uLy4uL3NoYXJlZC91dGlscydcbmltcG9ydCB7dH0gZnJvbSAnLi4vbXVsdGlsYW5ndWFnZS9sb2dpYydcbmltcG9ydCB7XG4gIEVYVEVOU0lPTl9TRVRUSU5HU19CVVRUT05fSUQsXG4gIEVYVEVOU0lPTl9TRVRUSU5HU19UQUJfSUQsXG4gIFNFVFRJTkdfQ0FMTFNfS0VZLFxuICBTRVRUSU5HX0RNX0tFWSxcbiAgU0VUVElOR19SRVNJWkVSX0tFWSxcbn0gZnJvbSAnLi9jb25zdGFudHMnXG5cbmV4cG9ydCBjb25zdCBzZXR1cEV4dGVuc2lvblNldHRpbmdzID0gKCkgPT4ge1xuICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICBjb25zdCBtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5VU0VSX1NFVFRJTkdTX01PREFMKVxuICAgIGlmIChtb2RhbCkge1xuICAgICAgaW5qZWN0TWVudUl0ZW0obW9kYWwpXG4gICAgICBpbmplY3RTZXR0aW5nc1BhbmVsKG1vZGFsKVxuICAgIH1cbiAgfSlcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7Y2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlfSlcbn1cblxuY29uc3QgaW5qZWN0TWVudUl0ZW0gPSAobW9kYWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gIGNvbnN0IHRhYkxpc3QgPSBtb2RhbC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihNTV9TRUxFQ1RPUlMuVEFCX0xJU1QpXG4gIGlmICghdGFiTGlzdCkgcmV0dXJuXG5cbiAgLy8gRmluZCBQbHVnaW4gU2V0dGluZ3MgZ3JvdXBcbiAgLy8gSXQgaXMgdXN1YWxseSBhIGRpdiB3aXRoIHJvbGU9XCJncm91cFwiIHRoYXQgY29udGFpbnMgJ9Cd0JDQodCi0KDQntCZ0JrQmCDQn9Cb0JDQk9CY0J3QkCcgaGVhZGVyIG9yIG90aGVyIHBsdWdpbiBidXR0b25zXG4gIC8vIFRoZSB1c2VyIHByb3ZpZGVkIEhUTUwgc2hvd3M6IDxkaXYgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbGxlZGJ5PVwidXNlclNldHRpbmdzTW9kYWwucGx1Z2luUHJlZmVyZW5jZXMuaGVhZGVyXCI+XG4gIC8vIDxkaXYgcm9sZT1cImhlYWRpbmdcIiAuLi4+0J3QkNCh0KLQoNCe0JnQmtCYINCf0JvQkNCT0JjQndCQPC9kaXY+IC4uLiA8L2Rpdj5cbiAgXG4gIGxldCBwbHVnaW5Hcm91cCA9IHRhYkxpc3QucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oTU1fU0VMRUNUT1JTLlBMVUdJTl9QUkVGRVJFTkNFU19IRUFERVIpXG4gIFxuICAvLyBJZiBubyBwbHVnaW4gZ3JvdXAgZXhpc3RzLCB3ZSBtaWdodCBuZWVkIHRvIGNyZWF0ZSBpdCBvciBhcHBlbmQgdG8gdGhlIG1haW4gbGlzdCBpZiB0aGF0J3MgaG93IGl0IHdvcmtzIHdoZW4gbm8gcGx1Z2lucyBhcmUgcHJlc2VudC5cbiAgLy8gQnV0IHVzdWFsbHkgdGhlcmUgaXMgYSBHZW5lcmFsIGdyb3VwLiBMZXQncyB0cnkgdG8gZmluZCB3aGVyZSB0byBpbnNlcnQuXG4gIC8vIElmIHBsdWdpbkdyb3VwIGV4aXN0cywgd2UgYXBwZW5kIHRoZXJlLlxuICBcbiAgaWYgKCFwbHVnaW5Hcm91cCkge1xuICAgIC8vIENoZWNrIGlmIHdlIGFscmVhZHkgY3JlYXRlZCBpdD9cbiAgICAvLyBPciBtYXliZSB3ZSBzaG91bGQgYXBwZW5kIHRvIHRoZSBlbmQgb2YgdGFiTGlzdCBpZiBubyBwbHVnaW4gZ3JvdXAgZm91bmQuXG4gICAgLy8gRm9yIG5vdywgbGV0J3MgYXNzdW1lIHdlIGNhbiBhcHBlbmQgdG8gdGhlIGxhc3QgZ3JvdXAgb3IgY3JlYXRlIGEgbmV3IG9uZS5cbiAgICAvLyBCdXQgbGV0J3MgbG9vayBmb3IgZXhpc3RpbmcgYnV0dG9ucyB0byBjbG9uZSBzdHJ1Y3R1cmUuXG4gICAgY29uc3QgbGFzdEdyb3VwID0gdGFiTGlzdC5sYXN0RWxlbWVudENoaWxkIGFzIEhUTUxFbGVtZW50XG4gICAgaWYgKGxhc3RHcm91cCkge1xuICAgICAgcGx1Z2luR3JvdXAgPSBsYXN0R3JvdXBcbiAgICB9XG4gIH1cblxuICBpZiAoIXBsdWdpbkdyb3VwKSByZXR1cm5cblxuICBpZiAocGx1Z2luR3JvdXAucXVlcnlTZWxlY3RvcihgIyR7RVhURU5TSU9OX1NFVFRJTkdTX0JVVFRPTl9JRH1gKSkgcmV0dXJuXG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcbiAgYnV0dG9uLmlkID0gRVhURU5TSU9OX1NFVFRJTkdTX0JVVFRPTl9JRFxuICBidXR0b24uY2xhc3NOYW1lID0gJ2N1cnNvci0tcG9pbnRlciBzdHlsZS0tbm9uZSBuYXYtcGlsbHNfX3RhYidcbiAgYnV0dG9uLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIHQoJ3NldHRpbmdzX3RpdGxlJykpXG4gIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ3JvbGUnLCAndGFiJylcbiAgYnV0dG9uLnNldEF0dHJpYnV0ZSgnYXJpYS1zZWxlY3RlZCcsICdmYWxzZScpXG4gIGJ1dHRvbi50YWJJbmRleCA9IC0xXG4gIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2FyaWEtY29udHJvbHMnLCBFWFRFTlNJT05fU0VUVElOR1NfVEFCX0lEKVxuICBcbiAgLy8gSWNvblxuICBjb25zdCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gIGljb24uY2xhc3NOYW1lID0gJ2ljb24nXG4gIGljb24uaW5uZXJIVE1MID0gbWF0dGVyVWlJY29uXG4gIGljb24uc3R5bGUud2lkdGggPSAnMTZweCdcbiAgaWNvbi5zdHlsZS5oZWlnaHQgPSAnMTZweCdcbiAgaWNvbi5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZS1mbGV4J1xuICBpY29uLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJ1xuICBpY29uLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcidcbiAgaWNvbi5zdHlsZS52ZXJ0aWNhbEFsaWduID0gJ21pZGRsZSdcbiAgaWNvbi5zdHlsZS5tYXJnaW5SaWdodCA9ICc4cHgnXG4gIFxuICBjb25zdCBzdmcgPSBpY29uLnF1ZXJ5U2VsZWN0b3IoJ3N2ZycpXG4gIGlmIChzdmcpIHtcbiAgICBzdmcuc3R5bGUud2lkdGggPSAnMTAwJSdcbiAgICBzdmcuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnXG4gICAgc3ZnLnN0eWxlLmZpbGwgPSAnY3VycmVudENvbG9yJ1xuICB9XG4gIFxuICBidXR0b24uYXBwZW5kQ2hpbGQoaWNvbilcbiAgYnV0dG9uLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHQoJ3NldHRpbmdzX3RpdGxlJykpKVxuICBcbiAgLy8gQWRkIGNsaWNrIGxpc3RlbmVyXG4gIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgYWN0aXZhdGVTZXR0aW5nc1RhYihtb2RhbClcbiAgfSlcblxuICAvLyBIYW5kbGUgc3dpdGNoaW5nIGF3YXkgZnJvbSBvdXIgdGFiXG4gIHRhYkxpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50XG4gICAgY29uc3QgY2xpY2tlZFRhYiA9IHRhcmdldC5jbG9zZXN0KE1NX1NFTEVDVE9SUy5OQVZfUElMTFNfVEFCKVxuICAgIFxuICAgIGlmIChjbGlja2VkVGFiICYmIGNsaWNrZWRUYWIuaWQgIT09IEVYVEVOU0lPTl9TRVRUSU5HU19CVVRUT05fSUQpIHtcbiAgICAgICAvLyBEZWFjdGl2YXRlIG15IHRhYlxuICAgICAgIGNvbnN0IG15VGFiID0gbW9kYWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oYCMke0VYVEVOU0lPTl9TRVRUSU5HU19CVVRUT05fSUR9YClcbiAgICAgICBpZiAobXlUYWIpIHtcbiAgICAgICAgIG15VGFiLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpXG4gICAgICAgICBteVRhYi5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCAnZmFsc2UnKVxuICAgICAgIH1cbiAgICAgICBcbiAgICAgICAvLyBIaWRlIG15IHBhbmVsXG4gICAgICAgY29uc3QgbXlQYW5lbCA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KGAjJHtFWFRFTlNJT05fU0VUVElOR1NfVEFCX0lEfWApXG4gICAgICAgaWYgKG15UGFuZWwpIHtcbiAgICAgICAgIG15UGFuZWwuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgICAgICAgbXlQYW5lbC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxuICAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcGx1Z2luR3JvdXAuYXBwZW5kQ2hpbGQoYnV0dG9uKVxufVxuXG5jb25zdCBpbmplY3RTZXR0aW5nc1BhbmVsID0gKG1vZGFsOiBIVE1MRWxlbWVudCkgPT4ge1xuICBjb25zdCBjb250ZW50Q29udGFpbmVyID0gbW9kYWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oTU1fU0VMRUNUT1JTLlNFVFRJTkdTX0NPTlRFTlQpXG4gIGlmICghY29udGVudENvbnRhaW5lcikgcmV0dXJuXG5cbiAgaWYgKGNvbnRlbnRDb250YWluZXIucXVlcnlTZWxlY3RvcihgIyR7RVhURU5TSU9OX1NFVFRJTkdTX1RBQl9JRH1gKSkgcmV0dXJuXG5cbiAgY29uc3QgcGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBwYW5lbC5pZCA9IEVYVEVOU0lPTl9TRVRUSU5HU19UQUJfSURcbiAgcGFuZWwuc2V0QXR0cmlidXRlKCdyb2xlJywgJ3RhYnBhbmVsJylcbiAgcGFuZWwuY2xhc3NOYW1lID0gJ2hpZGRlbicgLy8gU3RhcnQgaGlkZGVuXG4gIHBhbmVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcblxuICAvLyBIZWFkZXJcbiAgY29uc3QgaGVhZGVyRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgaGVhZGVyRGl2LmNsYXNzTmFtZSA9ICdtb2RhbC1oZWFkZXInXG4gIGNvbnN0IGNsb3NlQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcbiAgY2xvc2VCdG4udHlwZSA9ICdidXR0b24nXG4gIGNsb3NlQnRuLmNsYXNzTmFtZSA9ICdjbG9zZSdcbiAgY2xvc2VCdG4uZGF0YXNldC5kaXNtaXNzID0gJ21vZGFsJ1xuICBjbG9zZUJ0bi5pbm5lckhUTUwgPSAnPHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+w5c8L3NwYW4+J1xuICAvLyBXZSBjYW4ganVzdCByZWx5IG9uIGJ1YmJsaW5nIG9yIGF0dGFjaCBsaXN0ZW5lciBpZiBuZWVkZWQsIGJ1dCAnZGF0YS1kaXNtaXNzJyBtaWdodCBiZSBoYW5kbGVkIGJ5IE1NLlxuICAvLyBBY3R1YWxseSB3ZSBzaG91bGQgcmVwbGljYXRlIHRoZSBoZWFkZXIgc3RydWN0dXJlOlxuICAvLyA8ZGl2IGNsYXNzPVwibW9kYWwtaGVhZGVyXCI+PGJ1dHRvbiAuLi4gY2xhc3M9XCJjbG9zZVwiIC4uLj4uLi48L2J1dHRvbj48aDQgY2xhc3M9XCJtb2RhbC10aXRsZVwiPi4uLjwvaDQ+PC9kaXY+XG4gIFxuICBjb25zdCB0aXRsZUg0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDQnKVxuICB0aXRsZUg0LmNsYXNzTmFtZSA9ICdtb2RhbC10aXRsZSdcbiAgY29uc3QgYmFja0RpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGJhY2tEaXYuY2xhc3NOYW1lID0gJ21vZGFsLWJhY2snXG4gIGJhY2tEaXYuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiZmEgZmEtYW5nbGUtbGVmdFwiIGFyaWEtbGFiZWw9XCLQl9C90LDRh9C+0Log0YHQstC+0YDQsNGH0LjQstCw0L3QuNGPXCI+PC9pPicgLy8gVGhpcyBpcyBmb3IgbW9iaWxlIHVzdWFsbHlcbiAgY29uc3QgdGl0bGVTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gIHRpdGxlU3Bhbi50ZXh0Q29udGVudCA9IHQoJ3NldHRpbmdzX2hlYWRlcicpXG4gIFxuICB0aXRsZUg0LmFwcGVuZENoaWxkKGJhY2tEaXYpXG4gIHRpdGxlSDQuYXBwZW5kQ2hpbGQodGl0bGVTcGFuKVxuICBoZWFkZXJEaXYuYXBwZW5kQ2hpbGQoY2xvc2VCdG4pXG4gIGhlYWRlckRpdi5hcHBlbmRDaGlsZCh0aXRsZUg0KVxuICBcbiAgcGFuZWwuYXBwZW5kQ2hpbGQoaGVhZGVyRGl2KVxuXG4gIC8vIFNldHRpbmdzIEJvZHlcbiAgY29uc3QgdXNlclNldHRpbmdzRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgdXNlclNldHRpbmdzRGl2LmNsYXNzTmFtZSA9ICd1c2VyLXNldHRpbmdzJ1xuICBcbiAgY29uc3QgZGVza3RvcEhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGRlc2t0b3BIZWFkZXIuY2xhc3NOYW1lID0gJ3VzZXJTZXR0aW5nRGVza3RvcEhlYWRlcidcbiAgY29uc3QgaGVhZGVySDMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMycpXG4gIGhlYWRlckgzLmNsYXNzTmFtZSA9ICd0YWItaGVhZGVyJ1xuICBoZWFkZXJIMy50ZXh0Q29udGVudCA9IHQoJ3NldHRpbmdzX2hlYWRlcicpXG4gIGRlc2t0b3BIZWFkZXIuYXBwZW5kQ2hpbGQoaGVhZGVySDMpXG4gIHVzZXJTZXR0aW5nc0Rpdi5hcHBlbmRDaGlsZChkZXNrdG9wSGVhZGVyKVxuXG4gIGNvbnN0IGRpdmlkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBkaXZpZGVyLmNsYXNzTmFtZSA9ICdkaXZpZGVyLWRhcmsgZmlyc3QnXG4gIHVzZXJTZXR0aW5nc0Rpdi5hcHBlbmRDaGlsZChkaXZpZGVyKVxuXG4gIC8vIFNldHRpbmdzIFJvd3NcbiAgdXNlclNldHRpbmdzRGl2LmFwcGVuZENoaWxkKGNyZWF0ZVNldHRpbmdSb3coU0VUVElOR19SRVNJWkVSX0tFWSwgdCgnc2V0dGluZ19yZXNpemVyX3RpdGxlJyksIHQoJ3NldHRpbmdfcmVzaXplcl9kZXNjJyksIHRydWUpKVxuICB1c2VyU2V0dGluZ3NEaXYuYXBwZW5kQ2hpbGQoY3JlYXRlRGl2aWRlcigpKVxuICB1c2VyU2V0dGluZ3NEaXYuYXBwZW5kQ2hpbGQoY3JlYXRlU2V0dGluZ1JvdyhTRVRUSU5HX0RNX0tFWSwgdCgnc2V0dGluZ19kbV90aXRsZScpLCB0KCdzZXR0aW5nX2RtX2Rlc2MnKSwgZmFsc2UpKVxuICB1c2VyU2V0dGluZ3NEaXYuYXBwZW5kQ2hpbGQoY3JlYXRlRGl2aWRlcigpKVxuICB1c2VyU2V0dGluZ3NEaXYuYXBwZW5kQ2hpbGQoY3JlYXRlU2V0dGluZ1JvdyhTRVRUSU5HX0NBTExTX0tFWSwgdCgnc2V0dGluZ19jYWxsc190aXRsZScpLCB0KCdzZXR0aW5nX2NhbGxzX2Rlc2MnKSwgZmFsc2UpKVxuXG4gIHBhbmVsLmFwcGVuZENoaWxkKHVzZXJTZXR0aW5nc0RpdilcbiAgY29udGVudENvbnRhaW5lci5hcHBlbmRDaGlsZChwYW5lbClcbn1cblxuY29uc3QgY3JlYXRlRGl2aWRlciA9ICgpID0+IHtcbiAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgZGl2LmNsYXNzTmFtZSA9ICdkaXZpZGVyLWxpZ2h0J1xuICByZXR1cm4gZGl2XG59XG5cbmNvbnN0IGFjdGl2YXRlU2V0dGluZ3NUYWIgPSAobW9kYWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gIC8vIERlYWN0aXZhdGUgYWxsIHRhYnNcbiAgY29uc3QgdGFicyA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5OQVZfUElMTFNfVEFCKVxuICB0YWJzLmZvckVhY2godGFiID0+IHtcbiAgICB0YWIuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJylcbiAgICB0YWIuc2V0QXR0cmlidXRlKCdhcmlhLXNlbGVjdGVkJywgJ2ZhbHNlJylcbiAgfSlcblxuICAvLyBBY3RpdmF0ZSBvdXIgdGFiXG4gIGNvbnN0IG91clRhYiA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KGAjJHtFWFRFTlNJT05fU0VUVElOR1NfQlVUVE9OX0lEfWApXG4gIGlmIChvdXJUYWIpIHtcbiAgICBvdXJUYWIuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJylcbiAgICBvdXJUYWIuc2V0QXR0cmlidXRlKCdhcmlhLXNlbGVjdGVkJywgJ3RydWUnKVxuICB9XG5cbiAgLy8gSGlkZSBhbGwgcGFuZWxzXG4gIGNvbnN0IHBhbmVscyA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcuc2V0dGluZ3MtY29udGVudCBkaXYgPiBkaXZbcm9sZT1cInRhYnBhbmVsXCJdJylcbiAgcGFuZWxzLmZvckVhY2gocCA9PiB7XG4gICAgcC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gIH0pXG5cbiAgLy8gU2hvdyBvdXIgcGFuZWxcbiAgY29uc3Qgb3VyUGFuZWwgPSBtb2RhbC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihgIyR7RVhURU5TSU9OX1NFVFRJTkdTX1RBQl9JRH1gKVxuICBpZiAob3VyUGFuZWwpIHtcbiAgICBvdXJQYW5lbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJ1xuICAgIG91clBhbmVsLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpXG4gIH1cbn1cblxuY29uc3QgaXNFbmFibGVkID0gKGtleTogc3RyaW5nLCBkZWZhdWx0VmFsOiBib29sZWFuID0gZmFsc2UpID0+IHtcbiAgcmV0dXJuIGlzRmVhdHVyZUVuYWJsZWQoa2V5LCBkZWZhdWx0VmFsKVxufVxuXG5jb25zdCBzZXRFbmFibGVkID0gKGtleTogc3RyaW5nLCB2YWw6IGJvb2xlYW4pID0+IHtcbiAgc2V0RmVhdHVyZUVuYWJsZWQoa2V5LCB2YWwpXG59XG5cbmNvbnN0IGNyZWF0ZVNldHRpbmdSb3cgPSAoa2V5OiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgZGVmYXVsdFZhbDogYm9vbGVhbikgPT4ge1xuICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBcbiAgLy8gUmVuZGVyIE1pbiBWaWV3XG4gIGNvbnN0IHJlbmRlck1pbiA9ICgpID0+IHtcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJydcbiAgICBjb250YWluZXIuY2xhc3NOYW1lID0gJ3NlY3Rpb24tbWluJ1xuICAgIFxuICAgIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgaGVhZGVyLmNsYXNzTmFtZSA9ICdzZWNpb24tbWluX19oZWFkZXInXG4gICAgXG4gICAgY29uc3QgaDQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoNCcpXG4gICAgaDQuY2xhc3NOYW1lID0gJ3NlY3Rpb24tbWluX190aXRsZSdcbiAgICBoNC50ZXh0Q29udGVudCA9IHRpdGxlXG4gICAgXG4gICAgY29uc3QgZWRpdEJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG4gICAgZWRpdEJ0bi5jbGFzc05hbWUgPSAnY29sb3ItLWxpbmsgc3R5bGUtLW5vbmUgc2VjdGlvbi1taW5fX2VkaXQnXG4gICAgZWRpdEJ0bi5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJpY29uLXBlbmNpbC1vdXRsaW5lXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgdGl0bGU9XCLQl9C90LDRh9C+0Log0YDQtdC00LDQutGC0LjRgNC+0LLQsNC90LjRj1wiPjwvaT48c3Bhbj4nICsgdCgnbGFiZWxfZWRpdCcpICsgJzwvc3Bhbj4nXG4gICAgZWRpdEJ0bi5vbmNsaWNrID0gKCkgPT4gcmVuZGVyTWF4KClcblxuICAgIGhlYWRlci5hcHBlbmRDaGlsZChoNClcbiAgICBoZWFkZXIuYXBwZW5kQ2hpbGQoZWRpdEJ0bilcbiAgICBcbiAgICBjb25zdCBkZXNjRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBkZXNjRGl2LmNsYXNzTmFtZSA9ICdzZWN0aW9uLW1pbl9fZGVzY3JpYmUnXG4gICAgY29uc3QgZW5hYmxlZCA9IGlzRW5hYmxlZChrZXksIGRlZmF1bHRWYWwpXG4gICAgZGVzY0Rpdi50ZXh0Q29udGVudCA9IGVuYWJsZWQgPyB0KCdsYWJlbF9vbicpIDogdCgnbGFiZWxfb2ZmJylcblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChoZWFkZXIpXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGRlc2NEaXYpXG4gIH1cblxuICAvLyBSZW5kZXIgTWF4IFZpZXcgKEVkaXQgTW9kZSlcbiAgY29uc3QgcmVuZGVyTWF4ID0gKCkgPT4ge1xuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJ1xuICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSAnc2VjdGlvbi1tYXggZm9ybS1ob3Jpem9udGFsJ1xuICAgIFxuICAgIGNvbnN0IGg0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDQnKVxuICAgIGg0LmNsYXNzTmFtZSA9ICdjb2wtc20tMTIgc2VjdGlvbi10aXRsZSdcbiAgICBoNC50ZXh0Q29udGVudCA9IHRpdGxlXG4gICAgXG4gICAgY29uc3QgY29udGVudERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgY29udGVudERpdi5jbGFzc05hbWUgPSAnc2VjdGlvbkNvbnRlbnQgY29sLXNtLTEwIGNvbC1zbS1vZmZzZXQtMidcbiAgICBcbiAgICBjb25zdCBsaXN0RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBsaXN0RGl2LmNsYXNzTmFtZSA9ICdzZXR0aW5nLWxpc3QnXG4gICAgXG4gICAgY29uc3QgaXRlbURpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgaXRlbURpdi5jbGFzc05hbWUgPSAnc2V0dGluZy1saXN0LWl0ZW0nXG4gICAgXG4gICAgY29uc3QgZmllbGRzZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdmaWVsZHNldCcpXG4gICAgY29uc3QgbGVnZW5kID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGVnZW5kJylcbiAgICBsZWdlbmQuY2xhc3NOYW1lID0gJ2Zvcm0tbGVnZW5kIGhpZGRlbi1sYWJlbCdcbiAgICBsZWdlbmQudGV4dENvbnRlbnQgPSB0aXRsZVxuICAgIGZpZWxkc2V0LmFwcGVuZENoaWxkKGxlZ2VuZClcblxuICAgIGNvbnN0IGN1cnJlbnRWYWwgPSBpc0VuYWJsZWQoa2V5LCBkZWZhdWx0VmFsKVxuICAgIGxldCB0ZW1wVmFsID0gY3VycmVudFZhbFxuXG4gICAgY29uc3QgY3JlYXRlUmFkaW8gPSAodmFsOiBib29sZWFuLCBsYWJlbFRleHQ6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgcmFkaW9EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgcmFkaW9EaXYuY2xhc3NOYW1lID0gJ3JhZGlvJ1xuICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpXG4gICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgICAgIGlucHV0LnR5cGUgPSAncmFkaW8nXG4gICAgICBpbnB1dC5uYW1lID0ga2V5XG4gICAgICBpbnB1dC5jaGVja2VkID0gdmFsID09PSBjdXJyZW50VmFsXG4gICAgICBpbnB1dC5vbmNoYW5nZSA9ICgpID0+IHsgdGVtcFZhbCA9IHZhbCB9XG4gICAgICBcbiAgICAgIGNvbnN0IHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICAgIHNwYW4udGV4dENvbnRlbnQgPSBsYWJlbFRleHRcbiAgICAgIFxuICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQoaW5wdXQpXG4gICAgICBsYWJlbC5hcHBlbmRDaGlsZChzcGFuKVxuICAgICAgcmFkaW9EaXYuYXBwZW5kQ2hpbGQobGFiZWwpXG4gICAgICByYWRpb0Rpdi5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpKVxuICAgICAgcmV0dXJuIHJhZGlvRGl2XG4gICAgfVxuXG4gICAgZmllbGRzZXQuYXBwZW5kQ2hpbGQoY3JlYXRlUmFkaW8odHJ1ZSwgdCgnbGFiZWxfb24nKSkpXG4gICAgZmllbGRzZXQuYXBwZW5kQ2hpbGQoY3JlYXRlUmFkaW8oZmFsc2UsIHQoJ2xhYmVsX29mZicpKSlcbiAgICBcbiAgICBjb25zdCBkZXNjRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBkZXNjRGl2LmNsYXNzTmFtZSA9ICdtdC01J1xuICAgIGRlc2NEaXYuaW5uZXJIVE1MID0gYDxzcGFuPiR7ZGVzY308L3NwYW4+YFxuICAgIGZpZWxkc2V0LmFwcGVuZENoaWxkKGRlc2NEaXYpXG4gICAgXG4gICAgaXRlbURpdi5hcHBlbmRDaGlsZChmaWVsZHNldClcbiAgICBcbiAgICBjb25zdCBhY3Rpb25zRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBhY3Rpb25zRGl2LmNsYXNzTmFtZSA9ICdzZXR0aW5nLWxpc3QtaXRlbSdcbiAgICBhY3Rpb25zRGl2LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2hyJykpXG4gICAgXG4gICAgY29uc3Qgc2F2ZUJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG4gICAgc2F2ZUJ0bi5jbGFzc05hbWUgPSAnYnRuIGJ0bi1wcmltYXJ5J1xuICAgIHNhdmVCdG4udGV4dENvbnRlbnQgPSB0KCdsYWJlbF9zYXZlJylcbiAgICBzYXZlQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBzZXRFbmFibGVkKGtleSwgdGVtcFZhbClcbiAgICAgIC8vIFJlbG9hZCBwYWdlIHRvIGFwcGx5IGNoYW5nZXM/IE9yIHRyaWdnZXIgZXZlbnRzP1xuICAgICAgLy8gRm9yIG5vdywgd2UganVzdCBzYXZlLiBGZWF0dXJlcyBzaG91bGQgbGlzdGVuIG9yIGNoZWNrIG9uIGxvYWQuXG4gICAgICAvLyBJZGVhbGx5IHdlIHJlbG9hZCBwYWdlIG9yIGRpc3BhdGNoIGV2ZW50LlxuICAgICAgLy8gTGV0J3MgZGlzcGF0Y2ggYSBjdXN0b20gZXZlbnQuXG4gICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ21tLWV4dGVuc2lvbi1zZXR0aW5nLWNoYW5nZWQnLCB7IGRldGFpbDogeyBrZXksIHZhbHVlOiB0ZW1wVmFsIH0gfSkpXG4gICAgICBcbiAgICAgIC8vIEFsc28gcmVsb2FkIHBhZ2UgaWYgcmVxdWVzdGVkIGJ5IHVzZXI/IFwi0J/QvtC60LAg0L3QtSDRgdC00LXQu9Cw0LvQuCwg0YHQtNC10LvQsNC10Lwg0YHQsNC8INGE0YPQvdC60YbQuNC+0L3QsNC7INC/0L7Qt9C20LVcIlxuICAgICAgLy8gQnV0IHJlc2l6ZXIgYW5kIERNIGFyZSBhbHJlYWR5IHdvcmtpbmcuIFJlc2l6ZXIgY2hlY2tzIGxvZ2ljIG9uIGxvYWQuIERNIHRvby5cbiAgICAgIC8vIFNvIHJlbG9hZCBtaWdodCBiZSBuZWVkZWQgZm9yIGZ1bGwgZWZmZWN0LCBvciB3ZSBjYW4ganVzdCBsZWF2ZSBpdCBhcyBpcy5cbiAgICAgIC8vIEEgc2ltcGxlIHJlbG9hZCBwcm9tcHQgb3IgYXV0by1yZWxvYWQgaXMgZ29vZC5cbiAgICAgIC8vIEJ1dCB1c2VyIGRpZG4ndCBhc2sgZm9yIHJlbG9hZC5cbiAgICAgIFxuICAgICAgcmVuZGVyTWluKClcbiAgICB9XG4gICAgXG4gICAgY29uc3QgY2FuY2VsQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJylcbiAgICBjYW5jZWxCdG4uY2xhc3NOYW1lID0gJ2J0biBidG4tdGVydGlhcnknXG4gICAgY2FuY2VsQnRuLnRleHRDb250ZW50ID0gdCgnbGFiZWxfY2FuY2VsJylcbiAgICBjYW5jZWxCdG4ub25jbGljayA9ICgpID0+IHJlbmRlck1pbigpXG4gICAgXG4gICAgYWN0aW9uc0Rpdi5hcHBlbmRDaGlsZChzYXZlQnRuKVxuICAgIGFjdGlvbnNEaXYuYXBwZW5kQ2hpbGQoY2FuY2VsQnRuKVxuICAgIFxuICAgIGxpc3REaXYuYXBwZW5kQ2hpbGQoaXRlbURpdilcbiAgICBsaXN0RGl2LmFwcGVuZENoaWxkKGFjdGlvbnNEaXYpXG4gICAgY29udGVudERpdi5hcHBlbmRDaGlsZChsaXN0RGl2KVxuICAgIFxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChoNClcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY29udGVudERpdilcbiAgfVxuXG4gIHJlbmRlck1pbigpXG4gIHJldHVybiBjb250YWluZXJcbn1cbiIsImltcG9ydCB7aXNGZWF0dXJlRW5hYmxlZH0gZnJvbSAnLi4vLi4vc2hhcmVkL3V0aWxzJ1xuaW1wb3J0IHtTRVRUSU5HX0NBTExTX0tFWX0gZnJvbSAnLi4vZXh0ZW5zaW9uLXNldHRpbmdzL2NvbnN0YW50cydcblxuY29uc3QgSElERV9DQUxMU19FTkFCTEVEX0NMQVNTID0gJ21tLWhpZGUtY2FsbHMtZW5hYmxlZCdcblxuZXhwb3J0IGNvbnN0IHNldHVwRGlzYWJsZUNhbGxCdXR0b24gPSAoKSA9PiB7XG4gIC8vIFN1YnNjcmliZSB0byBzZXR0aW5ncyBjaGFuZ2VzXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtbS1leHRlbnNpb24tc2V0dGluZy1jaGFuZ2VkJywgKGV2ZW50OiBhbnkpID0+IHtcbiAgICBpZiAoZXZlbnQuZGV0YWlsPy5rZXkgPT09IFNFVFRJTkdfQ0FMTFNfS0VZKSB7XG4gICAgICB1cGRhdGVGZWF0dXJlU3RhdGUoKVxuICAgIH1cbiAgfSlcblxuICAvLyBJbml0aWFsIGNoZWNrXG4gIHVwZGF0ZUZlYXR1cmVTdGF0ZSgpXG59XG5cbmNvbnN0IHVwZGF0ZUZlYXR1cmVTdGF0ZSA9ICgpID0+IHtcbiAgY29uc3QgZW5hYmxlZCA9IGlzRmVhdHVyZUVuYWJsZWQoU0VUVElOR19DQUxMU19LRVkpXG4gIFxuICBpZiAoZW5hYmxlZCkge1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QuYWRkKEhJREVfQ0FMTFNfRU5BQkxFRF9DTEFTUylcbiAgfSBlbHNlIHtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShISURFX0NBTExTX0VOQUJMRURfQ0xBU1MpXG4gIH1cbn1cbiIsImltcG9ydCAnLi9zdHlsZS5jc3MnXG5pbXBvcnQgJy4vZmVhdHVyZXMvdGVhbS1zaWRlYmFyLXJlc2l6ZXIvc3R5bGUuY3NzJ1xuaW1wb3J0ICcuL2ZlYXR1cmVzL2RtLXRlYW0vc3R5bGUuY3NzJ1xuaW1wb3J0ICcuL2ZlYXR1cmVzL2Rpc2FibGUtY2FsbC1idXR0b24vc3R5bGUuY3NzJ1xuaW1wb3J0IHtzZXR1cFRlYW1TaWRlYmFyUmVzaXplcn0gZnJvbSAnLi9mZWF0dXJlcy90ZWFtLXNpZGViYXItcmVzaXplci9sb2dpYydcbmltcG9ydCB7c2V0dXBEbVBzZXVkb1RlYW19IGZyb20gJy4vZmVhdHVyZXMvZG0tdGVhbS9sb2dpYydcbmltcG9ydCB7c2V0dXBFeHRlbnNpb25TZXR0aW5nc30gZnJvbSAnLi9mZWF0dXJlcy9leHRlbnNpb24tc2V0dGluZ3MvbG9naWMnXG5pbXBvcnQge3NldHVwRGlzYWJsZUNhbGxCdXR0b259IGZyb20gJy4vZmVhdHVyZXMvZGlzYWJsZS1jYWxsLWJ1dHRvbi9sb2dpYydcbmltcG9ydCB7ZmluZFRlYW1TaWRlYmFyfSBmcm9tICcuL3NoYXJlZC9kb20nXG5pbXBvcnQge01NX1NFTEVDVE9SU30gZnJvbSAnLi9zaGFyZWQvc2VsZWN0b3JzJ1xuaW1wb3J0IHtpc01hdHRlcm1vc3R9IGZyb20gJy4vc2hhcmVkL3V0aWxzJ1xuaW1wb3J0IHtpbml0TGFuZ3VhZ2V9IGZyb20gJy4vZmVhdHVyZXMvbXVsdGlsYW5ndWFnZS9sb2dpYydcblxuLy8gQ2FjaGUgZm9yIHRlYW0gbmFtZXM6IGlkIC0+IGRpc3BsYXlfbmFtZVxuY29uc3QgdGVhbU5hbWVzQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5sZXQgdGVhbU5hbWVzRmV0Y2hlZCA9IGZhbHNlXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbnRlbnRTY3JpcHQoe1xuICBtYXRjaGVzOiBbJzxhbGxfdXJscz4nXSxcbiAgcnVuQXQ6ICdkb2N1bWVudF9lbmQnLFxuICBhc3luYyBtYWluKCkge1xuICAgIGlmICghaXNNYXR0ZXJtb3N0KCkpIHJldHVyblxuXG4gICAgYXdhaXQgaW5pdExhbmd1YWdlKClcbiAgICBzZXR1cEV4dGVuc2lvblNldHRpbmdzKClcbiAgICBzZXR1cERpc2FibGVDYWxsQnV0dG9uKClcbiAgICBcbiAgICAvLyBGZXRjaCB0ZWFtIG5hbWVzIGltbWVkaWF0ZWx5XG4gICAgZmV0Y2hUZWFtTmFtZXMoKVxuICAgIFxuICAgIGNvbnN0IHRyeUluaXQgPSAoKSA9PiB7XG4gICAgICBjb25zdCBzaWRlYmFyID0gZmluZFRlYW1TaWRlYmFyKClcbiAgICAgIGlmICghc2lkZWJhcikgcmV0dXJuIGZhbHNlXG4gICAgICBzZXR1cFRlYW1MYWJlbHMoc2lkZWJhcilcbiAgICAgIHNldHVwVGVhbVNpZGViYXJSZXNpemVyKHNpZGViYXIpXG4gICAgICBzZXR1cERtUHNldWRvVGVhbShzaWRlYmFyKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG5cbiAgICBpZiAodHJ5SW5pdCgpKSByZXR1cm5cbiAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICAgIGlmICh0cnlJbml0KCkpIG9ic2VydmVyLmRpc2Nvbm5lY3QoKVxuICAgIH0pXG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIHtjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWV9KVxuICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IG9ic2VydmVyLmRpc2Nvbm5lY3QoKSwgMTAwMDApXG4gIH1cbn0pXG5cbmNvbnN0IGZldGNoVGVhbU5hbWVzID0gYXN5bmMgKCkgPT4ge1xuICBpZiAodGVhbU5hbWVzRmV0Y2hlZCkgcmV0dXJuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2FwaS92NC91c2Vycy9tZS90ZWFtcycpXG4gICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zdCB0ZWFtcyA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGVhbXMpKSB7XG4gICAgICAgIHRlYW1zLmZvckVhY2goKHRlYW06IGFueSkgPT4ge1xuICAgICAgICAgIGlmICh0ZWFtLmlkICYmIHRlYW0uZGlzcGxheV9uYW1lKSB7XG4gICAgICAgICAgICB0ZWFtTmFtZXNDYWNoZS5zZXQodGVhbS5pZCwgdGVhbS5kaXNwbGF5X25hbWUpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICB0ZWFtTmFtZXNGZXRjaGVkID0gdHJ1ZVxuICAgICAgICAvLyBJZiBzaWRlYmFyIGlzIGFscmVhZHkgcmVuZGVyZWQsIHVwZGF0ZSBsYWJlbHNcbiAgICAgICAgY29uc3Qgc2lkZWJhciA9IGZpbmRUZWFtU2lkZWJhcigpXG4gICAgICAgIGlmIChzaWRlYmFyKSB7XG4gICAgICAgICAgY29uc3QgZHJvcHBhYmxlID0gc2lkZWJhci5xdWVyeVNlbGVjdG9yKE1NX1NFTEVDVE9SUy5EUk9QUEFCTEVfVEVBTVMpIGFzIEhUTUxFbGVtZW50IHwgbnVsbFxuICAgICAgICAgIGlmIChkcm9wcGFibGUpIHtcbiAgICAgICAgICAgIC8vIEZvcmNlIHJlLWFwcGx5IGxhYmVsc1xuICAgICAgICAgICAgY29uc3QgbGFiZWxzID0gZHJvcHBhYmxlLnF1ZXJ5U2VsZWN0b3JBbGwoJy5tbS10ZWFtLWxhYmVsJylcbiAgICAgICAgICAgIGxhYmVscy5mb3JFYWNoKGwgPT4gbC5yZW1vdmUoKSlcbiAgICAgICAgICAgIGFwcGx5TGFiZWxzKGRyb3BwYWJsZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBmZXRjaCB0ZWFtcycsIGUpXG4gIH1cbn1cblxuY29uc3Qgc2V0dXBUZWFtTGFiZWxzID0gKHNpZGViYXI6IEhUTUxFbGVtZW50KSA9PiB7XG4gIGNvbnN0IGRyb3BwYWJsZSA9IHNpZGViYXIucXVlcnlTZWxlY3RvcihNTV9TRUxFQ1RPUlMuRFJPUFBBQkxFX1RFQU1TKSBhcyBIVE1MRWxlbWVudCB8IG51bGxcbiAgaWYgKCFkcm9wcGFibGUpIHJldHVyblxuICBhcHBseUxhYmVscyhkcm9wcGFibGUpXG4gIGlmIChkcm9wcGFibGUuZGF0YXNldC5tbU9ic2VydmVyQXR0YWNoZWQgPT09ICd0cnVlJykgcmV0dXJuXG4gIGRyb3BwYWJsZS5kYXRhc2V0Lm1tT2JzZXJ2ZXJBdHRhY2hlZCA9ICd0cnVlJ1xuICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IGFwcGx5TGFiZWxzKGRyb3BwYWJsZSkpXG4gIG9ic2VydmVyLm9ic2VydmUoZHJvcHBhYmxlLCB7Y2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlfSlcbn1cblxuY29uc3QgYXBwbHlMYWJlbHMgPSAoZHJvcHBhYmxlOiBIVE1MRWxlbWVudCkgPT4ge1xuICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20oZHJvcHBhYmxlLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEFuY2hvckVsZW1lbnQ+KE1NX1NFTEVDVE9SUy5EUkFHR0FCTEVfVEVBTV9JVEVNKSlcbiAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgIGlmIChpdGVtLmlkID09PSAnc2VsZWN0X3RlYW1UZWFtQnV0dG9uJykgcmV0dXJuXG4gICAgaWYgKGl0ZW0ucXVlcnlTZWxlY3RvcignLm1tLXRlYW0tbGFiZWwnKSkgcmV0dXJuXG4gICAgXG4gICAgY29uc3QgbGFiZWxUZXh0ID0gZ2V0VGVhbU5hbWUoaXRlbSlcbiAgICBpZiAoIWxhYmVsVGV4dCkgcmV0dXJuXG4gICAgXG4gICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICBsYWJlbC5jbGFzc05hbWUgPSAnbW0tdGVhbS1sYWJlbCdcbiAgICBsYWJlbC50ZXh0Q29udGVudCA9IGxhYmVsVGV4dFxuICAgIGNvbnN0IHRlYW1Db250YWluZXIgPSBpdGVtLnF1ZXJ5U2VsZWN0b3IoJy50ZWFtLWNvbnRhaW5lcicpXG4gICAgaWYgKHRlYW1Db250YWluZXIpIHtcbiAgICAgIGl0ZW0uaW5zZXJ0QmVmb3JlKGxhYmVsLCB0ZWFtQ29udGFpbmVyLm5leHRTaWJsaW5nKVxuICAgIH0gZWxzZSB7XG4gICAgICBpdGVtLmFwcGVuZENoaWxkKGxhYmVsKVxuICAgIH1cbiAgfSlcbn1cblxuY29uc3QgZ2V0VGVhbU5hbWUgPSAoaXRlbTogSFRNTEFuY2hvckVsZW1lbnQpID0+IHtcbiAgaWYgKGl0ZW0uaWQgPT09ICdzZWxlY3RfdGVhbVRlYW1CdXR0b24nKSByZXR1cm4gbnVsbFxuICBcbiAgLy8gMS4gVHJ5IHRvIGdldCBmcm9tIEFQSSBjYWNoZSBieSBJRFxuICBjb25zdCBpZCA9IGl0ZW0uZGF0YXNldC5yYmREcmFnZ2FibGVJZFxuICBpZiAoaWQgJiYgdGVhbU5hbWVzQ2FjaGUuaGFzKGlkKSkge1xuICAgIHJldHVybiB0ZWFtTmFtZXNDYWNoZS5nZXQoaWQpXG4gIH1cbiAgXG4gIC8vIDIuIEZhbGxiYWNrIHRvIG9sZCBoZXVyaXN0aWMgbWV0aG9kcyAoYmV0dGVyIHRoYW4gbm90aGluZyB3aGlsZSBsb2FkaW5nKVxuICBjb25zdCBpY29uTGFiZWwgPSBnZXRUZWFtSWNvbkxhYmVsKGl0ZW0pXG4gIGlmIChpY29uTGFiZWwpIHJldHVybiBpY29uTGFiZWxcbiAgXG4gIGNvbnN0IGFyaWFMYWJlbCA9IGl0ZW0uZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJylcbiAgaWYgKCFhcmlhTGFiZWwpIHJldHVybiBudWxsXG4gIFxuICAvLyBUcnkgdG8gY2xlYW4gdXAgY29tbW9uIHByZWZpeGVzL3N1ZmZpeGVzIGlmIHBvc3NpYmxlLCBidXQgZG9uJ3QgYmUgdG9vIGFnZ3Jlc3NpdmVcbiAgbGV0IHRleHQgPSBhcmlhTGFiZWwudHJpbSgpXG4gIC8vIE9ubHkgcmVtb3ZlIHZlcnkgc3BlY2lmaWMgUnVzc2lhbiBwcmVmaXggaWYgd2UgYXJlIHN1cmVcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXtC60L7QvNCw0L3QtNCwXFxzKy9pLCAnJylcbiAgLy8gUmVtb3ZlIHVucmVhZCBzdWZmaXggd2hpY2ggaXMgY29tbW9uXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xccyvQvdC10L/RgNC+0YfQuNGC0LDQvVxcdyokL2ksICcnKVxuICBcbiAgcmV0dXJuIHRleHQudHJpbSgpIHx8IG51bGxcbn1cblxuY29uc3QgZ2V0VGVhbUljb25MYWJlbCA9IChpdGVtOiBIVE1MRWxlbWVudCkgPT4ge1xuICBjb25zdCBpY29uID0gaXRlbS5xdWVyeVNlbGVjdG9yKCdbZGF0YS10ZXN0aWQ9XCJ0ZWFtSWNvbkltYWdlXCJdLCBbZGF0YS10ZXN0aWQ9XCJ0ZWFtSWNvbkluaXRpYWxcIl0nKSBhcyBIVE1MRWxlbWVudCB8IG51bGxcbiAgY29uc3QgYXJpYUxhYmVsID0gaWNvbj8uZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyk/LnRyaW0oKVxuICBpZiAoIWFyaWFMYWJlbCkgcmV0dXJuIG51bGxcbiAgXG4gIC8vIFRyeSB0byBleHRyYWN0IG5hbWUgaWYgaXQgbWF0Y2hlcyBcIlRlYW0gTmFtZSBUZWFtIEltYWdlXCIgcGF0dGVyblxuICAvLyBUaGlzIGlzIGEgZ3Vlc3MsIGJ1dCBiZXR0ZXIgdGhhbiBmdWxsIHN0cmluZ1xuICAvLyBJZiBBUEkgd29ya3MsIHRoaXMgd29uJ3QgYmUgdXNlZCBvZnRlblxuICBcbiAgLy8gUnVzc2lhbjogXCLQutC+0LzQsNC90LTRiyBbTkFNRV1cIlxuICBsZXQgbWF0Y2ggPSBhcmlhTGFiZWwubWF0Y2goL9C60L7QvNCw0L3QtNGLXFxzKyguKykkL2kpXG4gIGlmIChtYXRjaD8uWzFdKSByZXR1cm4gbWF0Y2hbMV0udHJpbSgpXG4gIFxuICAvLyBFbmdsaXNoOiBcIltOQU1FXSBUZWFtIEltYWdlXCIgb3IgXCJUZWFtIEltYWdlXCJcbiAgLy8gSWYgaXQgZW5kcyB3aXRoIFwiVGVhbSBJbWFnZVwiLCByZW1vdmUgaXRcbiAgaWYgKGFyaWFMYWJlbC5lbmRzV2l0aCgnIFRlYW0gSW1hZ2UnKSkge1xuICAgICAgcmV0dXJuIGFyaWFMYWJlbC5yZXBsYWNlKC9cXHMrVGVhbSBJbWFnZSQvLCAnJykudHJpbSgpXG4gIH1cbiAgXG4gIC8vIEVuZ2xpc2g6IFwiW05BTUVdIFRlYW0gSW5pdGlhbHNcIlxuICBpZiAoYXJpYUxhYmVsLmVuZHNXaXRoKCcgVGVhbSBJbml0aWFscycpKSB7XG4gICAgICByZXR1cm4gYXJpYUxhYmVsLnJlcGxhY2UoL1xccytUZWFtIEluaXRpYWxzJC8sICcnKS50cmltKClcbiAgfVxuXG4gIHJldHVybiBhcmlhTGFiZWxcbn1cbiIsIi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLnRzXG5mdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcblx0aWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuXHRpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIG1ldGhvZChgW3d4dF0gJHthcmdzLnNoaWZ0KCl9YCwgLi4uYXJncyk7XG5cdGVsc2UgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG59XG4vKipcbiogV3JhcHBlciBhcm91bmQgYGNvbnNvbGVgIHdpdGggYSBcIlt3eHRdXCIgcHJlZml4XG4qL1xuY29uc3QgbG9nZ2VyID0ge1xuXHRkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuXHRsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG5cdHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuXHRlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuXG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGxvZ2dlciB9OyIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgYnJvd3NlciQxIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcblxuLy8jcmVnaW9uIHNyYy9icm93c2VyLnRzXG4vKipcbiogQ29udGFpbnMgdGhlIGBicm93c2VyYCBleHBvcnQgd2hpY2ggeW91IHNob3VsZCB1c2UgdG8gYWNjZXNzIHRoZSBleHRlbnNpb24gQVBJcyBpbiB5b3VyIHByb2plY3Q6XG4qIGBgYHRzXG4qIGltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG4qXG4qIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4qICAgLy8gLi4uXG4qIH0pXG4qIGBgYFxuKiBAbW9kdWxlIHd4dC9icm93c2VyXG4qL1xuY29uc3QgYnJvd3NlciA9IGJyb3dzZXIkMTtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBicm93c2VyIH07IiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuXG4vLyNyZWdpb24gc3JjL3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMudHNcbnZhciBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50ID0gY2xhc3MgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCBleHRlbmRzIEV2ZW50IHtcblx0c3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG5cdGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG5cdFx0c3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG5cdFx0dGhpcy5uZXdVcmwgPSBuZXdVcmw7XG5cdFx0dGhpcy5vbGRVcmwgPSBvbGRVcmw7XG5cdH1cbn07XG4vKipcbiogUmV0dXJucyBhbiBldmVudCBuYW1lIHVuaXF1ZSB0byB0aGUgZXh0ZW5zaW9uIGFuZCBjb250ZW50IHNjcmlwdCB0aGF0J3MgcnVubmluZy5cbiovXG5mdW5jdGlvbiBnZXRVbmlxdWVFdmVudE5hbWUoZXZlbnROYW1lKSB7XG5cdHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH06JHtldmVudE5hbWV9YDtcbn1cblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50LCBnZXRVbmlxdWVFdmVudE5hbWUgfTsiLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcblxuLy8jcmVnaW9uIHNyYy91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLnRzXG4vKipcbiogQ3JlYXRlIGEgdXRpbCB0aGF0IHdhdGNoZXMgZm9yIFVSTCBjaGFuZ2VzLCBkaXNwYXRjaGluZyB0aGUgY3VzdG9tIGV2ZW50IHdoZW4gZGV0ZWN0ZWQuIFN0b3BzXG4qIHdhdGNoaW5nIHdoZW4gY29udGVudCBzY3JpcHQgaXMgaW52YWxpZGF0ZWQuXG4qL1xuZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuXHRsZXQgaW50ZXJ2YWw7XG5cdGxldCBvbGRVcmw7XG5cdHJldHVybiB7IHJ1bigpIHtcblx0XHRpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuXHRcdG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG5cdFx0aW50ZXJ2YWwgPSBjdHguc2V0SW50ZXJ2YWwoKCkgPT4ge1xuXHRcdFx0bGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG5cdFx0XHRpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG5cdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50KG5ld1VybCwgb2xkVXJsKSk7XG5cdFx0XHRcdG9sZFVybCA9IG5ld1VybDtcblx0XHRcdH1cblx0XHR9LCAxZTMpO1xuXHR9IH07XG59XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgY3JlYXRlTG9jYXRpb25XYXRjaGVyIH07IiwiaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5pbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5cbi8vI3JlZ2lvbiBzcmMvdXRpbHMvY29udGVudC1zY3JpcHQtY29udGV4dC50c1xuLyoqXG4qIEltcGxlbWVudHMgW2BBYm9ydENvbnRyb2xsZXJgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQWJvcnRDb250cm9sbGVyKS5cbiogVXNlZCB0byBkZXRlY3QgYW5kIHN0b3AgY29udGVudCBzY3JpcHQgY29kZSB3aGVuIHRoZSBzY3JpcHQgaXMgaW52YWxpZGF0ZWQuXG4qXG4qIEl0IGFsc28gcHJvdmlkZXMgc2V2ZXJhbCB1dGlsaXRpZXMgbGlrZSBgY3R4LnNldFRpbWVvdXRgIGFuZCBgY3R4LnNldEludGVydmFsYCB0aGF0IHNob3VsZCBiZSB1c2VkIGluXG4qIGNvbnRlbnQgc2NyaXB0cyBpbnN0ZWFkIG9mIGB3aW5kb3cuc2V0VGltZW91dGAgb3IgYHdpbmRvdy5zZXRJbnRlcnZhbGAuXG4qXG4qIFRvIGNyZWF0ZSBjb250ZXh0IGZvciB0ZXN0aW5nLCB5b3UgY2FuIHVzZSB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvcjpcbipcbiogYGBgdHNcbiogaW1wb3J0IHsgQ29udGVudFNjcmlwdENvbnRleHQgfSBmcm9tICd3eHQvdXRpbHMvY29udGVudC1zY3JpcHRzLWNvbnRleHQnO1xuKlxuKiB0ZXN0KFwic3RvcmFnZSBsaXN0ZW5lciBzaG91bGQgYmUgcmVtb3ZlZCB3aGVuIGNvbnRleHQgaXMgaW52YWxpZGF0ZWRcIiwgKCkgPT4ge1xuKiAgIGNvbnN0IGN0eCA9IG5ldyBDb250ZW50U2NyaXB0Q29udGV4dCgndGVzdCcpO1xuKiAgIGNvbnN0IGl0ZW0gPSBzdG9yYWdlLmRlZmluZUl0ZW0oXCJsb2NhbDpjb3VudFwiLCB7IGRlZmF1bHRWYWx1ZTogMCB9KTtcbiogICBjb25zdCB3YXRjaGVyID0gdmkuZm4oKTtcbipcbiogICBjb25zdCB1bndhdGNoID0gaXRlbS53YXRjaCh3YXRjaGVyKTtcbiogICBjdHgub25JbnZhbGlkYXRlZCh1bndhdGNoKTsgLy8gTGlzdGVuIGZvciBpbnZhbGlkYXRlIGhlcmVcbipcbiogICBhd2FpdCBpdGVtLnNldFZhbHVlKDEpO1xuKiAgIGV4cGVjdCh3YXRjaGVyKS50b0JlQ2FsbGVkVGltZXMoMSk7XG4qICAgZXhwZWN0KHdhdGNoZXIpLnRvQmVDYWxsZWRXaXRoKDEsIDApO1xuKlxuKiAgIGN0eC5ub3RpZnlJbnZhbGlkYXRlZCgpOyAvLyBVc2UgdGhpcyBmdW5jdGlvbiB0byBpbnZhbGlkYXRlIHRoZSBjb250ZXh0XG4qICAgYXdhaXQgaXRlbS5zZXRWYWx1ZSgyKTtcbiogICBleHBlY3Qod2F0Y2hlcikudG9CZUNhbGxlZFRpbWVzKDEpO1xuKiB9KTtcbiogYGBgXG4qL1xudmFyIENvbnRlbnRTY3JpcHRDb250ZXh0ID0gY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuXHRzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIik7XG5cdGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcblx0YWJvcnRDb250cm9sbGVyO1xuXHRsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG5cdHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG5cdGNvbnN0cnVjdG9yKGNvbnRlbnRTY3JpcHROYW1lLCBvcHRpb25zKSB7XG5cdFx0dGhpcy5jb250ZW50U2NyaXB0TmFtZSA9IGNvbnRlbnRTY3JpcHROYW1lO1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG5cdFx0aWYgKHRoaXMuaXNUb3BGcmFtZSkge1xuXHRcdFx0dGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoeyBpZ25vcmVGaXJzdEV2ZW50OiB0cnVlIH0pO1xuXHRcdFx0dGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuXHRcdH0gZWxzZSB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cygpO1xuXHR9XG5cdGdldCBzaWduYWwoKSB7XG5cdFx0cmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcblx0fVxuXHRhYm9ydChyZWFzb24pIHtcblx0XHRyZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcblx0fVxuXHRnZXQgaXNJbnZhbGlkKCkge1xuXHRcdGlmIChicm93c2VyLnJ1bnRpbWU/LmlkID09IG51bGwpIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcblx0XHRyZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcblx0fVxuXHRnZXQgaXNWYWxpZCgpIHtcblx0XHRyZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuXHR9XG5cdC8qKlxuXHQqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cblx0KlxuXHQqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cblx0KlxuXHQqIEBleGFtcGxlXG5cdCogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG5cdCogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcblx0KiAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIoY2IpO1xuXHQqIH0pXG5cdCogLy8gLi4uXG5cdCogcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lcigpO1xuXHQqL1xuXHRvbkludmFsaWRhdGVkKGNiKSB7XG5cdFx0dGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcblx0XHRyZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcblx0fVxuXHQvKipcblx0KiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cblx0KiBhZnRlciB0aGUgY29udGV4dCBpcyBleHBpcmVkLlxuXHQqXG5cdCogQGV4YW1wbGVcblx0KiBjb25zdCBnZXRWYWx1ZUZyb21TdG9yYWdlID0gYXN5bmMgKCkgPT4ge1xuXHQqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcblx0KlxuXHQqICAgLy8gLi4uXG5cdCogfVxuXHQqL1xuXHRibG9jaygpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge30pO1xuXHR9XG5cdC8qKlxuXHQqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0SW50ZXJ2YWxgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG5cdCpcblx0KiBJbnRlcnZhbHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjbGVhckludGVydmFsYCBmdW5jdGlvbi5cblx0Ki9cblx0c2V0SW50ZXJ2YWwoaGFuZGxlciwgdGltZW91dCkge1xuXHRcdGNvbnN0IGlkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuXHRcdH0sIHRpbWVvdXQpO1xuXHRcdHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhckludGVydmFsKGlkKSk7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cdC8qKlxuXHQqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cblx0KlxuXHQqIFRpbWVvdXRzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgc2V0VGltZW91dGAgZnVuY3Rpb24uXG5cdCovXG5cdHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuXHRcdGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG5cdFx0fSwgdGltZW91dCk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuXHRcdHJldHVybiBpZDtcblx0fVxuXHQvKipcblx0KiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuXHQqIGludmFsaWRhdGVkLlxuXHQqXG5cdCogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbEFuaW1hdGlvbkZyYW1lYCBmdW5jdGlvbi5cblx0Ki9cblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgaWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKC4uLmFyZ3MpID0+IHtcblx0XHRcdGlmICh0aGlzLmlzVmFsaWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuXHRcdH0pO1xuXHRcdHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxBbmltYXRpb25GcmFtZShpZCkpO1xuXHRcdHJldHVybiBpZDtcblx0fVxuXHQvKipcblx0KiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cblx0KiBpbnZhbGlkYXRlZC5cblx0KlxuXHQqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxJZGxlQ2FsbGJhY2tgIGZ1bmN0aW9uLlxuXHQqL1xuXHRyZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG5cdFx0XHRpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuXHRcdH0sIG9wdGlvbnMpO1xuXHRcdHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcblx0XHRyZXR1cm4gaWQ7XG5cdH1cblx0YWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcblx0XHRpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuXHRcdFx0aWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG5cdFx0fVxuXHRcdHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4odHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsIGhhbmRsZXIsIHtcblx0XHRcdC4uLm9wdGlvbnMsXG5cdFx0XHRzaWduYWw6IHRoaXMuc2lnbmFsXG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCogQGludGVybmFsXG5cdCogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG5cdCovXG5cdG5vdGlmeUludmFsaWRhdGVkKCkge1xuXHRcdHRoaXMuYWJvcnQoXCJDb250ZW50IHNjcmlwdCBjb250ZXh0IGludmFsaWRhdGVkXCIpO1xuXHRcdGxvZ2dlci5kZWJ1ZyhgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGApO1xuXHR9XG5cdHN0b3BPbGRTY3JpcHRzKCkge1xuXHRcdHdpbmRvdy5wb3N0TWVzc2FnZSh7XG5cdFx0XHR0eXBlOiBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsXG5cdFx0XHRjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcblx0XHRcdG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcblx0XHR9LCBcIipcIik7XG5cdH1cblx0dmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG5cdFx0Y29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG5cdFx0Y29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuXHRcdGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuXHRcdHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuXHR9XG5cdGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG5cdFx0bGV0IGlzRmlyc3QgPSB0cnVlO1xuXHRcdGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG5cdFx0XHRpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG5cdFx0XHRcdHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG5cdFx0XHRcdGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcblx0XHRcdFx0aXNGaXJzdCA9IGZhbHNlO1xuXHRcdFx0XHRpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuXHRcdFx0XHR0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG5cdH1cbn07XG5cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgQ29udGVudFNjcmlwdENvbnRleHQgfTsiXSwibmFtZXMiOlsiZGVmaW5pdGlvbiIsInVwZGF0ZUZlYXR1cmVTdGF0ZSIsInByaW50IiwibG9nZ2VyIiwiYnJvd3NlciIsIld4dExvY2F0aW9uQ2hhbmdlRXZlbnQiLCJDb250ZW50U2NyaXB0Q29udGV4dCJdLCJtYXBwaW5ncyI6Ijs7QUFDQSxXQUFTLG9CQUFvQkEsYUFBWTtBQUN4QyxXQUFPQTtBQUFBLEVBQ1I7QUNITyxRQUFNLDBCQUEwQjtBQUNoQyxRQUFNLDhCQUE4QjtBQUNwQyxRQUFNLGtDQUFrQztBQUN4QyxRQUFNLGtDQUFrQztBQUN4QyxRQUFNLGtDQUFrQztBQ0p4QyxRQUFNLG1CQUFtQixDQUFDLEtBQWEsYUFBc0IsVUFBVTtBQUM1RSxVQUFNLE1BQU0sYUFBYSxRQUFRLEdBQUc7QUFDcEMsUUFBSSxRQUFRLEtBQU0sUUFBTztBQUN6QixXQUFPLFFBQVEsT0FBTyxRQUFRO0FBQUEsRUFDaEM7QUFFTyxRQUFNLG9CQUFvQixDQUFDLEtBQWEsUUFBaUI7QUFDOUQsaUJBQWEsUUFBUSxLQUFLLE1BQU0sTUFBTSxHQUFHO0FBQUEsRUFDM0M7QUFFTyxRQUFNLGVBQWUsTUFBTTtBQUNoQyxVQUFNLE9BQU8sU0FBUyxlQUFlLE1BQU07QUFDM0MsUUFBSSxNQUFNO0FBQ1IsVUFBSSxTQUFTLGVBQWUsMkJBQTJCLEVBQUcsUUFBTztBQUNqRSxVQUFJLEtBQUssY0FBYyxlQUFlLEVBQUcsUUFBTztBQUFBLElBQ2xEO0FBRUEsUUFBSSxTQUFTLGNBQWMscURBQXFELEVBQUcsUUFBTztBQUMxRixRQUFJLFNBQVMsY0FBYywrREFBK0QsRUFBRyxRQUFPO0FBRXBHLFVBQU0sV0FBVyxTQUFTLGNBQWMsVUFBVTtBQUNsRCxRQUFJLFVBQVUsYUFBYSxTQUFTLFlBQVksRUFBRyxR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
content;