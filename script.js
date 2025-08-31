// Bee-Healthy Pollen Tracker - Main Application
class BeeHealthyApp {
  constructor() {
    // API Configuration
    this.API_BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
    this.WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
    this.DEFAULT_LAT = 52.52;
    this.DEFAULT_LON = 13.41;

    // Global variables for current location
    this.currentLat = this.DEFAULT_LAT;
    this.currentLon = this.DEFAULT_LON;
    this.userLocationDetected = false;
    this.chartRange = 72; // Default to 3 days

    // Chart instances
    this.pollenChart = null;
    this.airQualityChart = null;
    this.uvChart = null;
    this.currentChartView = 'pollen';

    // Constants
    this.POLLEN_LEVELS = {
      LOW: 0,
      MODERATE: 10,
      HIGH: 50,
      VERY_HIGH: 100
    };

    this.UV_LEVELS = {
      LOW: 0,
      MODERATE: 3,
      HIGH: 6,
      VERY_HIGH: 8,
      EXTREME: 11
    };

    this.POLLEN_SEASONS = {
      'Birch': { season: 'Spring', months: 'March to May', peak: 'April' },
      'Alder': { season: 'Early Spring', months: 'February to April', peak: 'March' },
      'Grass': { season: 'Late Spring to Summer', months: 'May to July', peak: 'June' },
      'Mugwort': { season: 'Late Summer', months: 'August to September', peak: 'Late August' },
      'Olive': { season: 'Spring', months: 'April to June', peak: 'May' },
      'Ragweed': { season: 'Late Summer to Fall', months: 'August to October', peak: 'September' }
    };

    this.CHART_COLORS = {
      birch: '#4CAF50',
      alder: '#8BC34A',
      grass: '#CDDC39',
      mugwort: '#FF9800',
      olive: '#795548',
      ragweed: '#9C27B0',
      aqi: '#2196F3',
      pm10: '#FF5722',
      pm25: '#607D8B',
      uv: '#FFC107',
      dust: '#795548',
      carbon: '#607D8B',
      temperature: '#F44336',
      humidity: '#03A9F4'
    };

    this.POLLEN_INFO = {
      'Birch': "Birch pollen is a common allergen in many regions, typically released in the spring. It can cause symptoms like sneezing, runny nose, and itchy eyes. Those with birch pollen allergies may also experience cross-reactivity with certain foods like apples, carrots, and almonds.",
      'Alder': "Alder pollen is released by alder trees, primarily in early spring. It's a significant allergen in many parts of the world and can trigger hay fever symptoms. Alder trees are often found near water sources like rivers and streams.",
      'Grass': "Grass pollen is one of the most common causes of hay fever, with symptoms peaking in late spring and summer. There are many types of grass that produce pollen, and levels are typically highest on warm, dry days with mild winds.",
      'Mugwort': "Mugwort pollen is released by the mugwort plant, a weed that blooms in late summer. It's a common allergen in many regions and can cause severe allergic reactions. Mugwort pollen counts are highest in rural areas.",
      'Olive': "Olive pollen is prevalent in Mediterranean regions where olive trees are cultivated. The pollination season typically occurs in late spring. Olive pollen can cause significant allergic reactions in sensitive individuals.",
      'Ragweed': "Ragweed pollen is a major cause of seasonal allergies in North America, particularly in the fall. A single ragweed plant can produce up to a billion grains of pollen per season, which can travel hundreds of miles on the wind."
    };

    this.init();
  }

  // Initialize the application
  init() {
    this.setupEventListeners();
    this.loadSavedLocation();
    this.renderPollenCalendar();
    this.updateNotificationStatus();
  }

  // Set up event listeners
  setupEventListeners() {
    // Chart view buttons
    document.querySelectorAll('.chart-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchChartView(e.target.dataset.view);
      });
    });

    // Chart range selector
    document.getElementById('chart-range').addEventListener('change', (e) => {
      this.changeChartRange(parseInt(e.target.value));
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });

    // Keyboard navigation for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  // Load saved location from localStorage
  loadSavedLocation() {
    const savedLat = localStorage.getItem('beeHealthyLat');
    const savedLon = localStorage.getItem('beeHealthyLon');
    
    if (savedLat && savedLon) {
      this.currentLat = parseFloat(savedLat);
      this.currentLon = parseFloat(savedLon);
      this.userLocationDetected = true;
      this.refreshData();
    } else {
      // Try to detect location immediately on load
      this.detectUserLocation();
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notification.className = 'notification';
    notification.classList.add(`notification-${type}`);
    notificationText.textContent = message;
    
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);

    // Show browser notification if permission granted
    this.showBrowserNotification(message, type);
  }

  // Show browser notification
  async showBrowserNotification(message, type = 'info') {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      this.createBrowserNotification(message, type);
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.createBrowserNotification(message, type);
      }
    }
  }

  // Create browser notification
  createBrowserNotification(message, type) {
    const title = type === 'warning' ? '⚠️ High Pollen Alert' : 'ℹ️ Bee-Healthy Update';
    
    const notification = new Notification(title, {
      body: message,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'bee-healthy-notification',
      requireInteraction: type === 'warning',
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 10 seconds (except warnings)
    if (type !== 'warning') {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      this.showNotification('Notifications not supported in this browser', 'info');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      this.showNotification('Please enable notifications in your browser settings', 'warning');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.showNotification('Notifications enabled! You\'ll now receive pollen alerts.', 'info');
      this.updateNotificationStatus();
      return true;
    } else {
      this.showNotification('Notification permission denied', 'info');
      this.updateNotificationStatus();
      return false;
    }
  }

  // Update notification status display
  updateNotificationStatus() {
    const statusEl = document.getElementById('notification-status');
    if (!statusEl) return;

    if (!('Notification' in window)) {
      statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Notifications not supported';
      statusEl.style.color = 'var(--danger)';
    } else if (Notification.permission === 'granted') {
      statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Browser notifications enabled';
      statusEl.style.color = 'var(--success)';
    } else if (Notification.permission === 'denied') {
      statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Notifications blocked - check browser settings';
      statusEl.style.color = 'var(--warning)';
    } else {
      statusEl.innerHTML = '<i class="fas fa-question-circle"></i> Click "Enable Browser Notifications" to get alerts';
      statusEl.style.color = 'var(--text-light)';
    }
  }

  // Test notification
  testNotification() {
    this.showNotification('This is a test notification. You will be alerted when pollen levels are high.', 'info');
  }

  // Show help modal
  showHelp() {
    document.getElementById('helpModal').style.display = 'flex';
  }

  // Close help modal
  closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
  }

  // Close all modals
  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }

  // Print report
  printReport() {
    window.print();
  }

  // Share report
  shareReport(platform) {
    const location = document.getElementById('location').textContent;
    const pollenLevel = document.getElementById('pollen-level').textContent;
    
    if (navigator.share) {
      navigator.share({
        title: 'Bee-Healthy Pollen Report',
        text: `Current pollen levels in ${location}: ${pollenLevel}`,
        url: window.location.href
      })
      .catch(error => {
        this.showNotification('Sharing failed. Please try again.', 'info');
      });
    } else {
      // Fallback for browsers without Web Share API
      const shareText = `Current pollen levels in ${location}: ${pollenLevel}`;
      const shareUrl = window.location.href;
      
      if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`);
      } else if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
      }
    }
  }

  // Change chart range
  changeChartRange(range) {
    this.chartRange = range;
    this.updateCharts();
  }

  // Calendar state
  currentCalendarDate = new Date();
  
  // Render pollen calendar
  renderPollenCalendar() {
    this.updateCalendarDisplay();
  }
  
  // Update calendar display
  updateCalendarDisplay() {
    const monthYearEl = document.getElementById('calendar-month-year');
    const daysContainer = document.getElementById('calendar-days');
    
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    // Update month/year header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // Adjust start date to include previous month's days to fill first week
    const dayOfWeek = firstDay.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    // Generate calendar days
    let calendarHTML = '';
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate || currentDate.getDay() !== 0) {
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = this.isToday(currentDate);
      const pollenLevel = this.getPollenLevelForDate(currentDate);
      
      let dayClasses = 'calendar-day';
      if (!isCurrentMonth) dayClasses += ' other-month';
      if (isToday) dayClasses += ' today';
      
      calendarHTML += `
        <div class="${dayClasses}" onclick="app.showDayDetails('${currentDate.toISOString()}')">
          <div class="calendar-day-number">${currentDate.getDate()}</div>
          ${pollenLevel ? `<div class="calendar-day-pollen ${pollenLevel.toLowerCase().replace(' ', '-')}">${pollenLevel}</div>` : ''}
        </div>
      `;
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    daysContainer.innerHTML = calendarHTML;
  }
  
  // Check if a date is today
  isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  
  // Get pollen level for a specific date (mock data for now)
  getPollenLevelForDate(date) {
    // This would ideally use real historical data or predictions
    // For now, we'll generate some realistic seasonal patterns
    const month = date.getMonth();
    const day = date.getDate();
    
    // Spring months (March-May) - higher pollen
    if (month >= 2 && month <= 4) {
      if (month === 3 && day >= 15 && day <= 30) return 'High'; // April peak
      if (month === 4 && day >= 1 && day <= 15) return 'High'; // April peak
      if (month === 2 && day >= 20) return 'Moderate'; // Late March
      if (month === 4 && day >= 16) return 'Moderate'; // Late April
      return 'Low';
    }
    
    // Summer months (June-August) - grass pollen
    if (month >= 5 && month <= 7) {
      if (month === 5 && day >= 20) return 'High'; // Late May
      if (month === 6) return 'High'; // June peak
      if (month === 7 && day <= 15) return 'Moderate'; // Early July
      return 'Low';
    }
    
    // Fall months (September-November) - ragweed
    if (month >= 8 && month <= 10) {
      if (month === 8 && day >= 20) return 'Moderate'; // Late August
      if (month === 9) return 'High'; // September peak
      if (month === 10 && day <= 15) return 'Moderate'; // Early October
      return 'Low';
    }
    
    // Winter months - minimal pollen
    return null;
  }
  
  // Navigate to previous month
  previousMonth() {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
    this.updateCalendarDisplay();
  }
  
  // Navigate to next month
  nextMonth() {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
    this.updateCalendarDisplay();
  }
  
  // Show details for a specific day
  showDayDetails(dateString) {
    const date = new Date(dateString);
    const pollenLevel = this.getPollenLevelForDate(date);
    const pollenInfo = this.getPollenInfoForDate(date);
    
    let message = `Date: ${date.toLocaleDateString()}`;
    if (pollenLevel) {
      message += `\nPollen Level: ${pollenLevel}`;
      message += `\n\n${pollenInfo}`;
    } else {
      message += '\nPollen Level: Minimal';
      message += '\n\nWinter months typically have minimal pollen activity.';
    }
    
    this.showNotification(message, 'info');
  }
  
  // Get pollen information for a specific date
  getPollenInfoForDate(date) {
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) {
      return 'Spring pollen season - primarily tree pollen (birch, alder, oak). Consider keeping windows closed and using air purifiers.';
    } else if (month >= 5 && month <= 7) {
      return 'Summer pollen season - primarily grass pollen. Peak levels typically occur on warm, dry days.';
    } else if (month >= 8 && month <= 10) {
      return 'Fall pollen season - primarily weed pollen (ragweed, mugwort). Levels can be high in rural areas.';
    } else {
      return 'Winter season - minimal pollen activity. Good time for outdoor activities if weather permits.';
    }
  }











  // Generate email summary content for EmailJS template
  generateEmailSummary() {
    const currentDate = new Date().toLocaleDateString();
    const location = document.getElementById('location')?.textContent || 'Unknown Location';
    const pollenLevel = document.getElementById('pollen-level')?.textContent || 'Unknown';
    const mainAllergen = document.getElementById('main-allergen')?.textContent || 'Unknown';
    
    // Get pollen level class for styling
    let pollenLevelClass = 'low';
    if (pollenLevel.toLowerCase().includes('high')) {
      pollenLevelClass = 'high';
    } else if (pollenLevel.toLowerCase().includes('moderate')) {
      pollenLevelClass = 'moderate';
    }
    
    // Format user allergies
    let userAllergies = 'None specified';
    if (this.userProfile?.allergies?.length > 0) {
      userAllergies = this.userProfile.allergies.map(allergy => 
        allergy.charAt(0).toUpperCase() + allergy.slice(1)
      ).join(', ');
    }
    
    // Format severity level
    let severityLevel = 'Not specified';
    if (this.userProfile?.severity) {
      severityLevel = this.userProfile.severity.charAt(0).toUpperCase() + 
                     this.userProfile.severity.slice(1);
    }
    
    // Format medications
    let userMedications = '';
    if (this.userProfile?.medications) {
      userMedications = this.userProfile.medications;
    }
    
    return {
      date: currentDate,
      location: location,
      pollen_level: pollenLevel,
      pollen_level_class: pollenLevelClass,
      main_allergen: mainAllergen,
      user_allergies: userAllergies,
      severity_level: severityLevel,
      user_medications: userMedications
    };
  }



  // Get pollen level category
  getPollenLevelCategory(value) {
    if (value >= this.POLLEN_LEVELS.VERY_HIGH) return 'Very High';
    if (value >= this.POLLEN_LEVELS.HIGH) return 'High';
    if (value >= this.POLLEN_LEVELS.MODERATE) return 'Moderate';
    return 'Low';
  }

  // Get UV level category
  getUVLevelCategory(value) {
    if (value >= this.UV_LEVELS.EXTREME) return 'Extreme';
    if (value >= this.UV_LEVELS.VERY_HIGH) return 'Very High';
    if (value >= this.UV_LEVELS.HIGH) return 'High';
    if (value >= this.UV_LEVELS.MODERATE) return 'Moderate';
    return 'Low';
  }

  // Get UV level class
  getUVLevelClass(level) {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('extreme')) return 'uv-extreme';
    if (levelLower.includes('very high')) return 'uv-very-high';
    if (levelLower.includes('high')) return 'uv-high';
    if (levelLower.includes('moderate')) return 'uv-moderate';
    return 'uv-low';
  }

  // Get pollen level color class
  getPollenLevelClass(level) {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('very high') || levelLower.includes('high')) return 'high';
    if (levelLower.includes('moderate')) return 'moderate';
    return 'low';
  }

  // Format pollen value
  formatPollenValue(value) {
    return value ? `${value.toFixed(1)} grains/m³` : '0.0 grains/m³';
  }

  // Get location name from coordinates
  async getLocationName(lat, lon) {
    try {
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const data = await response.json();
      return data.city || data.locality || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    } catch (error) {
      console.warn('Failed to get location name:', error);
      return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
  }

  // Detect user's current location
  detectUserLocation() {
    const locationBtn = document.getElementById('location-btn');
    const locationStatus = document.getElementById('location-status');
    
    // Disable button and show loading
    locationBtn.disabled = true;
    locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
    locationStatus.textContent = 'Requesting location permission...';
    locationStatus.className = 'location-status';

    if (!navigator.geolocation) {
      this.showLocationError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // Success callback
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Update global location variables
        this.currentLat = lat;
        this.currentLon = lon;
        this.userLocationDetected = true;
        
        // Save to local storage
        localStorage.setItem('beeHealthyLat', lat);
        localStorage.setItem('beeHealthyLon', lon);
        
        locationStatus.textContent = `Location detected! (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        locationStatus.className = 'location-status';
        
        // Fetch data for new location
        await this.refreshData();
        
        // Re-enable button
        locationBtn.disabled = false;
        locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use My Location';
      },
      // Error callback
      (error) => {
        let errorMessage = 'Unable to retrieve your location.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          case error.UNKNOWN_ERROR:
            errorMessage = 'An unknown error occurred while getting location.';
            break;
        }
        
        this.showLocationError(errorMessage);
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  // Show location error
  showLocationError(message) {
    const locationBtn = document.getElementById('location-btn');
    const locationStatus = document.getElementById('location-status');
    
    locationStatus.textContent = message;
    locationStatus.className = 'location-error';
    
    // Re-enable button
    locationBtn.disabled = false;
    locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use My Location';
  }

  // Switch chart view
  switchChartView(view) {
    this.currentChartView = view;
    
    // Update button states
    document.querySelectorAll('.chart-btn[data-view]').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Recreate charts with new view
    if (this.pollenChart) {
      this.updateCharts();
    }
  }

  // Create pollen chart
  createPollenChart(hourlyData) {
    const ctx = document.getElementById('pollenChart').getContext('2d');
    
    // Destroy existing chart
    if (this.pollenChart) {
      this.pollenChart.destroy();
    }

    // Prepare data - show selected range of data
    const dataPoints = Math.min(this.chartRange, hourlyData.time.length);
    const labels = hourlyData.time.slice(0, dataPoints).map(time => {
      const date = new Date(time);
      if (this.chartRange <= 24) {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit'
        });
      }
    });

    const datasets = [];
    
    if (this.currentChartView === 'pollen' || this.currentChartView === 'combined') {
      datasets.push({
        label: 'Birch Pollen',
        data: hourlyData.birch_pollen.slice(0, dataPoints),
        borderColor: this.CHART_COLORS.birch,
        backgroundColor: this.CHART_COLORS.birch + '20',
        tension: 0.4,
        borderWidth: 2
      });
      datasets.push({
        label: 'Grass Pollen',
        data: hourlyData.grass_pollen.slice(0, dataPoints),
        borderColor: this.CHART_COLORS.grass,
        backgroundColor: this.CHART_COLORS.grass + '20',
        tension: 0.4,
        borderWidth: 2
      });
      datasets.push({
        label: 'Mugwort Pollen',
        data: hourlyData.mugwort_pollen.slice(0, dataPoints),
        borderColor: this.CHART_COLORS.mugwort,
        backgroundColor: this.CHART_COLORS.mugwort + '20',
        tension: 0.4,
        borderWidth: 2
      });
    }

    if (this.currentChartView === 'air' || this.currentChartView === 'combined') {
      datasets.push({
        label: 'US AQI',
        data: hourlyData.us_aqi ? hourlyData.us_aqi.slice(0, dataPoints) : [],
        borderColor: this.CHART_COLORS.aqi,
        backgroundColor: this.CHART_COLORS.aqi + '20',
        tension: 0.4,
        borderWidth: 2,
        yAxisID: 'y1'
      });
    }

    if (this.currentChartView === 'uv') {
      datasets.push({
        label: 'UV Index',
        data: hourlyData.uv_index ? hourlyData.uv_index.slice(0, dataPoints) : [],
        borderColor: this.CHART_COLORS.uv,
        backgroundColor: this.CHART_COLORS.uv + '20',
        tension: 0.4,
        borderWidth: 2
      });
    }

    this.pollenChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: this.chartRange <= 24 ? 'Time of Day' : 'Date'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: this.currentChartView === 'uv' ? 'UV Index' : 'Pollen (grains/m³)'
            }
          },
          y1: {
            type: 'linear',
            display: this.currentChartView === 'air' || this.currentChartView === 'combined',
            position: 'right',
            title: {
              display: true,
              text: 'AQI'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        plugins: {
          title: {
            display: true,
            text: this.currentChartView === 'pollen' ? `Pollen Levels (${this.chartRange <= 24 ? '24 Hours' : this.chartRange === 72 ? '3 Days' : '7 Days'})` : 
                  this.currentChartView === 'air' ? `Air Quality Index (${this.chartRange <= 24 ? '24 Hours' : this.chartRange === 72 ? '3 Days' : '7 Days'})` : 
                  this.currentChartView === 'uv' ? `UV Index (${this.chartRange <= 24 ? '24 Hours' : this.chartRange === 72 ? '3 Days' : '7 Days'})` :
                  `Pollen Levels & Air Quality (${this.chartRange <= 24 ? '24 Hours' : this.chartRange === 72 ? '3 Days' : '7 Days'})`
          },
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  }

  // Fetch pollen and air quality data from Open-Meteo API
  async refreshData() {
    try {
      // Show loading state
      this.showLoadingState();

      // Clear any existing error messages
      this.clearErrors();

      // Fetch air quality data
      const aqResponse = await fetch(`${this.API_BASE_URL}?latitude=${this.currentLat}&longitude=${this.currentLon}&hourly=pm10,pm2_5,birch_pollen,alder_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,us_aqi,european_aqi,uv_index,dust&current=european_aqi,us_aqi,birch_pollen,alder_pollen,mugwort_pollen,grass_pollen,olive_pollen,ragweed_pollen,uv_index,pm2_5&timezone=auto&forecast_days=7`);
      
      if (!aqResponse.ok) {
        throw new Error(`Air quality API error! status: ${aqResponse.status}`);
      }

      const aqData = await aqResponse.json();
      
      // Fetch weather data
      const weatherResponse = await fetch(`${this.WEATHER_API_URL}?latitude=${this.currentLat}&longitude=${this.currentLon}&current=temperature_2m,relative_humidity_2m&hourly=temperature_2m,relative_humidity_2m&timezone=auto&forecast_days=1`);
      
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error! status: ${weatherResponse.status}`);
      }

      const weatherData = await weatherResponse.json();
      
      // Combine data
      const combinedData = {
        ...aqData,
        weather: weatherData
      };
      
      // Store hourly data globally for charts
      window.hourlyData = combinedData.hourly;
      
      // Get location name
      const locationName = await this.getLocationName(this.currentLat, this.currentLon);
      
      // Process current data
      const current = combinedData.current;
      
      // Debug: Check if current data exists
      if (!current) {
        console.error('No current data available');
        document.getElementById("pollen-breakdown").innerHTML = '<div class="error">No current data available</div>';
        return;
      }
      
      const pollenTypes = {
        'Birch': current.birch_pollen || 0,
        'Alder': current.alder_pollen || 0,
        'Grass': current.grass_pollen || 0,
        'Mugwort': current.mugwort_pollen || 0,
        'Olive': current.olive_pollen || 0,
        'Ragweed': current.ragweed_pollen || 0
      };

      // Check if any pollen data is available
      const hasPollenData = Object.values(pollenTypes).some(value => value > 0);

      // Find main allergen (highest pollen count)
      const mainAllergen = Object.entries(pollenTypes).reduce((a, b) => 
        pollenTypes[a[0]] > pollenTypes[b[0]] ? a : b
      );

      // Calculate overall pollen level
      const totalPollen = Object.values(pollenTypes).reduce((sum, value) => sum + (value || 0), 0);
      const overallPollenLevel = this.getPollenLevelCategory(totalPollen);

      // Get UV index from current data
      const currentUVIndex = current.uv_index || 0;
      const uvLevel = this.getUVLevelCategory(currentUVIndex);

      // Get temperature from weather data
      const currentTemp = combinedData.weather.current ? combinedData.weather.current.temperature_2m : null;

      // Update UI with timezone information
      const timezoneInfo = combinedData.timezone ? ` (${combinedData.timezone})` : '';
      const locationText = this.userLocationDetected ? `${locationName} 🌿 (Your Location)${timezoneInfo}` : `${locationName} 🌿${timezoneInfo}`;
      document.getElementById("location").textContent = locationText;

      const pollenLevelEl = document.getElementById("pollen-level");
      pollenLevelEl.textContent = overallPollenLevel;
      pollenLevelEl.className = this.getPollenLevelClass(overallPollenLevel);
      
      document.getElementById("main-allergen").textContent = mainAllergen[0];
      document.getElementById("aqi").textContent = `EU: ${current.european_aqi} | US: ${current.us_aqi}`;
      
      const uvIndexEl = document.getElementById("uv-index");
      uvIndexEl.textContent = `${currentUVIndex.toFixed(1)} (${uvLevel})`;
      uvIndexEl.className = this.getUVLevelClass(uvLevel);
      
      if (currentTemp) {
        document.getElementById("temperature").textContent = `${currentTemp}°C`;
      }

      // Update pollen breakdown
      this.updatePollenBreakdown(pollenTypes);

      // Update air quality details
      this.updateAirQualityDetails(current, combinedData.weather.current);

      // Update forecast with 7-day data
      this.updateForecast(combinedData.hourly);

      // Create charts
      this.createPollenChart(combinedData.hourly);

      // Show notification if pollen is high
      if (overallPollenLevel === 'High' || overallPollenLevel === 'Very High') {
        this.showNotification(`High pollen alert! Current level: ${overallPollenLevel}. Take precautions if you have allergies.`, 'warning');
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      this.showErrorState(error.message);
    }
  }

  // Show loading state
  showLoadingState() {
    document.getElementById("location").innerHTML = '<span class="loading-spinner"></span> Loading...';
    document.getElementById("pollen-level").innerHTML = '<span class="loading-spinner"></span> Loading...';
    document.getElementById("main-allergen").innerHTML = '<span class="loading-spinner"></span> Loading...';
    document.getElementById("aqi").innerHTML = '<span class="loading-spinner"></span> Loading...';
    document.getElementById("uv-index").innerHTML = '<span class="loading-spinner"></span> Loading...';
    document.getElementById("temperature").innerHTML = '<span class="loading-spinner"></span> Loading...';
  }

  // Show error state
  showErrorState(errorMessage) {
    document.getElementById("location").textContent = "Error loading data";
    document.getElementById("pollen-level").textContent = "Error";
    document.getElementById("main-allergen").textContent = "Error";
    document.getElementById("aqi").textContent = "Error";
    document.getElementById("uv-index").textContent = "Error";
    document.getElementById("temperature").textContent = "Error";
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Failed to load data: ${errorMessage}`;
    document.querySelector('.location-info').appendChild(errorDiv);
  }

  // Clear errors
  clearErrors() {
    const existingErrors = document.querySelectorAll('.error');
    existingErrors.forEach(error => error.remove());
  }

  // Update pollen breakdown section
  updatePollenBreakdown(pollenTypes) {
    const breakdownDiv = document.getElementById("pollen-breakdown");
    breakdownDiv.innerHTML = '';

    if (!pollenTypes || Object.keys(pollenTypes).length === 0) {
      breakdownDiv.innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> No pollen data available</div>';
      return;
    }

    let hasData = false;
    Object.entries(pollenTypes).forEach(([type, value]) => {
      const pollenValue = value || 0;
      const level = this.getPollenLevelCategory(pollenValue);
      const levelClass = this.getPollenLevelClass(level);

      const displayValue = pollenValue > 0 ? pollenValue.toFixed(1) : '0.0';
      const displayLevel = pollenValue > 0 ? level : 'None';

      const itemDiv = document.createElement('div');
      itemDiv.className = 'pollen-item';

      itemDiv.innerHTML = `
        <span>
          ${type} Pollen:
          <button onclick="app.showPollenInfo('${type}')" style="margin-left:6px; background:none; border:none; cursor:pointer; font-size:1.1em;" aria-label="More info about ${type} pollen">ℹ️</button>
        </span>
        <span class="pollen-value ${levelClass}">${displayValue} grains/m³ 
          <span class="badge ${levelClass}">${displayLevel}</span>
        </span>
      `;
      breakdownDiv.appendChild(itemDiv);

      if (pollenValue > 0) {
        hasData = true;
      }
    });

    if (!hasData) {
      const noteDiv = document.createElement('div');
      noteDiv.className = 'loading';
      noteDiv.style.marginTop = '10px';
      noteDiv.style.fontStyle = 'italic';
      noteDiv.innerHTML = '<i class="fas fa-check"></i> No significant pollen detected at this time';
      breakdownDiv.appendChild(noteDiv);
    }
  }

  // Update air quality details
  updateAirQualityDetails(current, weatherCurrent) {
    const detailsDiv = document.getElementById("air-quality-details");
    const uvLevel = this.getUVLevelCategory(current.uv_index || 0);
    const uvLevelClass = this.getUVLevelClass(uvLevel);
    
    let html = `
      <div class="pollen-item">
        <span>European AQI:</span>
        <span class="pollen-value">${current.european_aqi}</span>
      </div>
      <div class="pollen-item">
        <span>US AQI:</span>
        <span class="pollen-value">${current.us_aqi}</span>
      </div>
      <div class="pollen-item">
        <span>PM2.5:</span>
        <span class="pollen-value">${(current.pm2_5 || 0).toFixed(1)} μg/m³</span>
      </div>
      <div class="pollen-item">
        <span>UV Index:</span>
        <span class="pollen-value ${uvLevelClass}">${(current.uv_index || 0).toFixed(1)} (${uvLevel})</span>
      </div>
    `;
    
    if (weatherCurrent) {
      html += `
        <div class="pollen-item">
          <span>Temperature:</span>
          <span class="pollen-value">${weatherCurrent.temperature_2m}°C</span>
        </div>
        <div class="pollen-item">
          <span>Humidity:</span>
          <span class="pollen-value">${weatherCurrent.relative_humidity_2m}%</span>
        </div>
      `;
    }
    
    html += `
      <div class="pollen-item">
        <span>Data Time:</span>
        <span class="pollen-value">${new Date(current.time).toLocaleString()}</span>
      </div>
    `;
    
    detailsDiv.innerHTML = html;
  }

  // Update forecast section
  updateForecast(hourlyData) {
    const forecastList = document.getElementById("forecast-list");
    forecastList.innerHTML = '';

    // Get next 7 days forecast (every 24 hours)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);
      
      // Get average pollen for the day (using first hour of the day)
      const dayIndex = i * 24;
      const grassPollen = hourlyData.grass_pollen[dayIndex] || 0;
      const birchPollen = hourlyData.birch_pollen[dayIndex] || 0;
      const mugwortPollen = hourlyData.mugwort_pollen[dayIndex] || 0;
      const alderPollen = hourlyData.alder_pollen[dayIndex] || 0;
      const olivePollen = hourlyData.olive_pollen[dayIndex] || 0;
      const ragweedPollen = hourlyData.ragweed_pollen[dayIndex] || 0;
      
      const totalPollen = grassPollen + birchPollen + mugwortPollen + alderPollen + olivePollen + ragweedPollen;
      const level = this.getPollenLevelCategory(totalPollen);
      const levelClass = this.getPollenLevelClass(level);
      
      const li = document.createElement('li');
      li.innerHTML = `${days[forecastDate.getDay()]} – <span class="${levelClass}">${level}</span>`;
      forecastList.appendChild(li);
    }
  }

  // Show pollen info modal
  showPollenInfo(type) {
    document.getElementById('pollenInfoTitle').textContent = type + " Pollen";
    document.getElementById('pollenInfoText').textContent = this.POLLEN_INFO[type] || "No info available.";
    
    // Add season information
    const seasonInfo = this.POLLEN_SEASONS[type];
    let seasonHtml = "<strong>Seasonal Information:</strong><br>";
    
    if (seasonInfo) {
      seasonHtml += `
        Season: ${seasonInfo.season}<br>
        Months: ${seasonInfo.months}<br>
        Peak: ${seasonInfo.peak}
      `;
    } else {
      seasonHtml += "No seasonal data available.";
    }
    
    document.getElementById('pollenSeasonInfo').innerHTML = seasonHtml;
    document.getElementById('pollenInfoModal').style.display = 'flex';
  }

  // Hide pollen info modal
  hidePollenInfo() {
    document.getElementById('pollenInfoModal').style.display = 'none';
  }

  // Update charts
  updateCharts() {
    if (window.hourlyData) {
      this.createPollenChart(window.hourlyData);
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Create global app instance
  window.app = new BeeHealthyApp();
});
