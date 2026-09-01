/**
 * HappiPlates AI Assistant Chatbot Engine
 * Features: Automatic DOM injection, knowledge base matching, interactive page triggers, quick prompt chips.
 */

class HappiChatbot {
  constructor() {
    this.isOpen = false;
    this.unreadCount = 0;
    this.init();
  }

  init() {
    this.injectDOM();
    this.bindEvents();
    this.sendInitialGreeting();
  }

  injectDOM() {
    if (document.getElementById('happi-chat-fab')) return;

    // Create FAB
    const fab = document.createElement('button');
    fab.id = 'happi-chat-fab';
    fab.setAttribute('aria-label', 'Open HappiPlates AI Chat Assistant');
    fab.innerHTML = `
      <span>🤖</span>
      <span class="happi-chat-badge" id="happi-chat-badge" style="display:none;">1</span>
    `;
    document.body.appendChild(fab);

    // Create Window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'happi-chat-window';
    chatWindow.innerHTML = `
      <div class="happi-chat-header">
        <div class="happi-chat-bot-info">
          <div class="happi-chat-avatar">
            🤖
            <span class="happi-chat-online-dot"></span>
          </div>
          <div class="happi-chat-title">
            <h4>HappiBot AI</h4>
            <p>Community & Food Rescue Assistant</p>
          </div>
        </div>
        <div class="happi-chat-controls">
          <button class="happi-chat-btn-icon" id="happi-chat-clear" title="Clear Chat">🗑️</button>
          <button class="happi-chat-btn-icon" id="happi-chat-close" title="Minimize">✖</button>
        </div>
      </div>

      <div class="happi-chat-body" id="happi-chat-body">
        <!-- Messages & typing indicator render here -->
      </div>

      <div class="happi-chat-footer">
        <input type="text" id="happi-chat-input" placeholder="Ask about donating, AI scanner, delivery..." autocomplete="off" />
        <button id="happi-chat-send" aria-label="Send message">➔</button>
      </div>
    `;
    document.body.appendChild(chatWindow);
  }

  bindEvents() {
    const fab = document.getElementById('happi-chat-fab');
    const chatWindow = document.getElementById('happi-chat-window');
    const closeBtn = document.getElementById('happi-chat-close');
    const clearBtn = document.getElementById('happi-chat-clear');
    const sendBtn = document.getElementById('happi-chat-send');
    const inputField = document.getElementById('happi-chat-input');

    fab.addEventListener('click', () => this.toggleWindow());
    closeBtn.addEventListener('click', () => this.closeWindow());
    clearBtn.addEventListener('click', () => this.clearChat());
    
    sendBtn.addEventListener('click', () => this.handleUserSubmit());
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleUserSubmit();
      }
    });

    // Delegate click for quick chips and action links
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('chat-chip')) {
        const query = e.target.getAttribute('data-query') || e.target.textContent;
        this.processUserQuery(query);
      }
      if (e.target.classList.contains('trigger-action-btn')) {
        const action = e.target.getAttribute('data-action');
        this.executeAction(action);
      }
    });
  }

  toggleWindow() {
    this.isOpen = !this.isOpen;
    const windowEl = document.getElementById('happi-chat-window');
    const badgeEl = document.getElementById('happi-chat-badge');

    if (this.isOpen) {
      windowEl.classList.add('active');
      this.unreadCount = 0;
      badgeEl.style.display = 'none';
      document.getElementById('happi-chat-input').focus();
    } else {
      windowEl.classList.remove('active');
    }
  }

  closeWindow() {
    this.isOpen = false;
    document.getElementById('happi-chat-window').classList.remove('active');
  }

  clearChat() {
    const body = document.getElementById('happi-chat-body');
    body.innerHTML = '';
    this.sendInitialGreeting();
  }

  sendInitialGreeting() {
    const greeting = `Hello! 👋 I'm **HappiBot**, your AI assistant for HappiPlates. How can I help you today?`;
    const chips = [
      { label: "🍎 How to Donate Food", query: "How do I donate food?" },
      { label: "🔬 AI Freshness Scanner", query: "Tell me about the AI Quality Scanner" },
      { label: "💳 Donate Funds", query: "How to make a money donation?" },
      { label: "🚚 Delivery Volunteer", query: "How to become a delivery partner?" }
    ];
    this.addBotMessage(greeting, chips);
  }

  handleUserSubmit() {
    const inputField = document.getElementById('happi-chat-input');
    const text = inputField.value.trim();
    if (!text) return;

    inputField.value = '';
    this.addUserMessage(text);
    this.showTypingIndicator();

    setTimeout(() => {
      this.hideTypingIndicator();
      this.processUserQuery(text);
    }, 600 + Math.random() * 400);
  }

  addUserMessage(text) {
    const body = document.getElementById('happi-chat-body');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg user';
    msgDiv.innerHTML = `
      <div class="chat-bubble">${this.escapeHTML(text)}</div>
      <div class="chat-time">${timeStr}</div>
    `;
    body.appendChild(msgDiv);
    this.scrollToBottom();
  }

  addBotMessage(text, chips = null, actionBtn = null) {
    const body = document.getElementById('happi-chat-body');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg bot';

    let chipsHTML = '';
    if (chips && chips.length > 0) {
      chipsHTML = `
        <div class="chat-chips-container">
          ${chips.map(c => `<button class="chat-chip" data-query="${c.query}">${c.label}</button>`).join('')}
        </div>
      `;
    }

    let actionHTML = '';
    if (actionBtn) {
      actionHTML = `<button class="chat-action-btn trigger-action-btn" data-action="${actionBtn.action}">${actionBtn.label}</button>`;
    }

    msgDiv.innerHTML = `
      <div class="chat-bubble">
        ${this.formatMarkdown(text)}
        ${actionHTML}
        ${chipsHTML}
      </div>
      <div class="chat-time">${timeStr}</div>
    `;

    body.appendChild(msgDiv);
    this.scrollToBottom();

    if (!this.isOpen) {
      this.unreadCount++;
      const badge = document.getElementById('happi-chat-badge');
      badge.textContent = this.unreadCount;
      badge.style.display = 'flex';
    }
  }

  showTypingIndicator() {
    const body = document.getElementById('happi-chat-body');
    if (document.getElementById('happi-typing-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'happi-typing-indicator';
    indicator.className = 'chat-msg bot';
    indicator.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    body.appendChild(indicator);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const el = document.getElementById('happi-typing-indicator');
    if (el) el.remove();
  }

  scrollToBottom() {
    const body = document.getElementById('happi-chat-body');
    body.scrollTop = body.scrollHeight;
  }

  processUserQuery(rawInput) {
    const text = rawInput.toLowerCase();

    // Matching Logic
    if (this.matchKeywords(text, ['donate food', 'how to donate', 'surplus', 'rice', 'bread', 'vegetables', 'post donation', 'meal'])) {
      this.addBotMessage(
        `To donate surplus food, click the **Donate Food Now** button below. You can select food categories (Rice, Pulses, Breads, Vegetables, etc.), enter the quantity, and optionally share your live pickup location!`,
        [
          { label: "🔬 Check Food Freshness First", query: "AI Quality Scanner" },
          { label: "💳 Donate Funds Instead", query: "Donate Funds" }
        ],
        { label: "📦 Open Food Donation Form", action: "open_food_modal" }
      );
    }
    else if (this.matchKeywords(text, ['ai', 'scanner', 'freshness', 'quality', 'cnn', 'spoilage', 'test', 'photo', 'picture', 'image'])) {
      this.addBotMessage(
        `Our state-of-the-art **AI Quality & Freshness Scanner** uses multi-parameter CNN analysis to test parameters like texture integrity, browning index, color change, moisture loss, and time degradation kinetics!`,
        [
          { label: "⚡ Try AI Scanner Now", query: "Scroll to AI Scanner" },
          { label: "🍎 Post a Donation", query: "How do I donate food?" }
        ],
        { label: "🔬 Scroll to AI Scanner Section", action: "scroll_ai_scanner" }
      );
    }
    else if (this.matchKeywords(text, ['fund', 'money', 'pay', 'razorpay', 'upi', 'rupee', 'inr', 'cash', 'monetary', 'donate funds'])) {
      this.addBotMessage(
        `Monetary contributions allow HappiPlates to purchase fresh produce, grains, and cover delivery logistics for community kitchens. You can pay via **Direct 0% Fee UPI (GPay/PhonePe/Paytm QR Code)** or via **Razorpay Payment Gateway**!`,
        [
          { label: "⚡ Direct 0% Fee UPI", query: "How to make a money donation?" },
          { label: "📊 See Ecological Impact", query: "Ecological Impact" }
        ],
        { label: "💳 Open Funds Donation Modal", action: "open_funds_modal" }
      );
    }
    else if (this.matchKeywords(text, ['volunteer', 'delivery', 'driver', 'pickup', 'partner', 'deliver', 'collect', 'courier'])) {
      this.addBotMessage(
        `As a delivery partner, you get real-time notifications for nearby surplus food pickups and deliver them safely to shelters and community kitchens. You can sign in to access your Delivery Dashboard!`,
        [
          { label: "🔑 Login to Account", query: "Where do I login?" }
        ],
        { label: "🚚 Go to Delivery Partner Portal", action: "nav_delivery_page" }
      );
    }
    else if (this.matchKeywords(text, ['impact', 'co2', 'water', 'environment', 'calculate', 'liters', 'kg'])) {
      this.addBotMessage(
        `Rescuing food prevents organic matter from decomposing in landfills, which releases harmful methane gas. Use our **Real-time Ecological Impact Calculator** to calculate exact CO2 and water saved!`,
        [],
        { label: "📊 Scroll to Impact Calculator", action: "scroll_impact" }
      );
    }
    else if (this.matchKeywords(text, ['login', 'account', 'register', 'sign in', 'admin', 'my account'])) {
      this.addBotMessage(
        `You can log in or register as a donor, volunteer, or admin on our login portal!`,
        [],
        { label: "🔐 Go to Login Page", action: "nav_login_page" }
      );
    }
    else if (this.matchKeywords(text, ['hello', 'hi', 'hey', 'greetings', 'start', 'help', 'who are you'])) {
      this.sendInitialGreeting();
    }
    else if (this.matchKeywords(text, ['contact', 'support', 'email', 'phone', 'location', 'whatsapp', 'address'])) {
      this.addBotMessage(
        `You can reach the HappiPlates team directly via email at **abhayakatiyar@gmail.com** or reach out through our social links at the bottom of the page!`,
        [
          { label: "❓ Frequently Asked Questions", query: "Show FAQ" }
        ],
        { label: "📍 Scroll to Contact Section", action: "scroll_contact" }
      );
    }
    else if (this.matchKeywords(text, ['faq', 'question', 'answers'])) {
      this.addBotMessage(
        `Here are common answers:\n• **Who can donate?** Individuals, restaurants, event planners.\n• **Is it free?** Yes, 100% free for donors & volunteers.\n• **How is tracking done?** Real-time GPS mapping via Leaflet.`,
        [
          { label: "🍎 How to Donate Food", query: "How do I donate food?" },
          { label: "🔬 AI Scanner Info", query: "Tell me about the AI Quality Scanner" }
        ],
        { label: "❓ View FAQ Accordion", action: "scroll_faq" }
      );
    }
    else {
      // Fallback
      this.addBotMessage(
        `I'm here to help with food donations, AI quality scans, monetary contributions, or volunteer tracking. Please choose an option or rephrase your question!`,
        [
          { label: "🍎 Donate Food", query: "How do I donate food?" },
          { label: "🔬 Test Quality", query: "Tell me about the AI Quality Scanner" },
          { label: "💳 Donate Funds", query: "How to make a money donation?" },
          { label: "❓ FAQ & Support", query: "Show FAQ" }
        ]
      );
    }
  }

  matchKeywords(text, keywords) {
    return keywords.some(kw => text.includes(kw));
  }

  executeAction(action) {
    switch (action) {
      case 'open_food_modal':
        const foodModal = document.getElementById('donation-modal');
        if (foodModal) {
          foodModal.style.display = 'block';
        } else {
          window.location.href = 'index.html#donate';
        }
        break;
      case 'open_funds_modal':
        const fundsModal = document.getElementById('funds-modal');
        if (fundsModal) {
          fundsModal.style.display = 'block';
        } else {
          window.location.href = 'index.html#donate';
        }
        break;
      case 'scroll_ai_scanner':
        const scannerEl = document.getElementById('ai-scanner');
        if (scannerEl) scannerEl.scrollIntoView({ behavior: 'smooth' });
        else window.location.href = 'index.html#ai-scanner';
        break;
      case 'scroll_impact':
        const impactEl = document.getElementById('impact');
        if (impactEl) impactEl.scrollIntoView({ behavior: 'smooth' });
        else window.location.href = 'index.html#impact';
        break;
      case 'scroll_faq':
        const faqEl = document.getElementById('faq');
        if (faqEl) faqEl.scrollIntoView({ behavior: 'smooth' });
        else window.location.href = 'index.html#faq';
        break;
      case 'scroll_contact':
        const contactEl = document.querySelector('.contact-us');
        if (contactEl) contactEl.scrollIntoView({ behavior: 'smooth' });
        else window.location.href = 'index.html#about';
        break;
      case 'nav_delivery_page':
        window.location.href = 'delivery.html';
        break;
      case 'nav_login_page':
        window.location.href = 'login.html';
        break;
    }
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  formatMarkdown(text) {
    let formatted = this.escapeHTML(text);
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points
    formatted = formatted.replace(/\n• (.*?)/g, '<br>• $1');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
}

// Auto-instantiate when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new HappiChatbot());
} else {
  new HappiChatbot();
}
