// Screen Management
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  // Show the requested screen
  document.getElementById(screenId).classList.add('active');
}

// Initialize navigation handlers
document.addEventListener('DOMContentLoaded', () => {
  // Handle WhatsApp login button
  const whatsappLoginBtn = document.querySelector('.whatsapp-login-btn');
  whatsappLoginBtn?.addEventListener('click', () => {
    showScreen('verify-screen');
  });

  // Handle verification button
  const verifyBtn = document.querySelector('.verify-btn');
  verifyBtn?.addEventListener('click', () => {
    const phoneNumber = document.getElementById('phone-number')?.value;
    if (phoneNumber && phoneNumber.length >= 10) {
      showScreen('profile-screen');
    } else {
      alert('Por favor, insira um número de telefone válido');
    }
  });

  // Handle save profile button
  const saveProfileBtn = document.querySelector('.save-profile-btn');
  saveProfileBtn?.addEventListener('click', () => {
    saveProfile();
  });

  // Handle back navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      showScreen('home-screen');
    }
  });
});

// Photo Upload Preview
const photoInput = document.getElementById('photo-input');
const photoPreview = document.querySelector('.photo-preview');

photoInput?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      photoPreview.innerHTML = `<img src="${e.target.result}" alt="Profile photo">`;
    };
    reader.readAsDataURL(file);
  }
});

// Tags Management
const tagInput = document.getElementById('tag-input');
const tagsContainer = document.querySelector('.tags-container');
let tags = [];

tagInput?.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const tag = this.value.trim();
    if (tag && tags.length < 3) {
      addTag(tag);
      this.value = '';
    }
  }
});

function addTag(tag) {
  if (!tags.includes(tag) && tags.length < 3) {
    tags.push(tag);
    updateTags();
  }
}

function removeTag(tag) {
  tags = tags.filter(t => t !== tag);
  updateTags();
}

function updateTags() {
  if (!tagsContainer) return;
  
  tagsContainer.innerHTML = tags.map(tag => `
    <div class="tag">
      #${tag}
      <i class="fas fa-times" onclick="removeTag('${tag}')"></i>
    </div>
  `).join('');
}

// Status Toggle
const statusButtons = document.querySelectorAll('.status-btn');
statusButtons.forEach(button => {
  button.addEventListener('click', function() {
    statusButtons.forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');
  });
});

// Save Profile
function saveProfile() {
  const name = document.getElementById('name')?.value;
  const status = document.querySelector('.status-btn.active')?.dataset.status;
  
  if (!name) {
    alert('Por favor, preencha seu nome');
    return;
  }
  
  if (tags.length === 0) {
    alert('Por favor, adicione pelo menos uma tag de serviço');
    return;
  }
  
  // Simulate saving profile
  alert('Perfil salvo com sucesso!');
  showScreen('home-screen');
}

// Add click handler for search icon
document.querySelector('.search-icon')?.addEventListener('click', function() {
  document.querySelector('input')?.focus();
});

// Add click handler for explore button
document.querySelector('.explore-btn')?.addEventListener('click', function() {
  // Placeholder for future functionality
  console.log('Explorar iniciado...');
});

// Prevent form submission on enter key
document.querySelector('input')?.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
  }
});