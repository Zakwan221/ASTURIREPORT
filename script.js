// Enhanced script.js - ASTURI Report Accounting System with File-Based Storage Support

// Global variables
let topics = [];
let currentTopicId = null;
let currentSubtopicId = null;
let currentPDF = null;
let pdfDoc = null;
let pageNum = 1;
let pageCount = 0;
let scale = 1.2;
let canvas = null;
let ctx = null;
let renameTargetId = null;
let renameTargetType = null; // 'topic' or 'subtopic'

// Enhanced storage variables
let db = null;
let storageType = 'memory'; // Will be updated based on available storage
let inMemoryStorage = new Map(); // Fallback storage

// Storage key
const STORAGE_KEY = 'asturi_report_topics';
const DB_NAME = 'AsturiDB';
const DB_VERSION = 1;

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Initialize enhanced storage
    await initializeEnhancedStorage();
    
    // Load data and render
    await loadData();
    renderTopics();
    
    // Initialize canvas
    canvas = document.getElementById('pdf-canvas');
    ctx = canvas.getContext('2d');
    
    // Setup radio button change handlers
    setupModalHandlers();
    
    // Add right-click context menu
    setupContextMenu();
    
    // Show enhanced system status
    await showEnhancedSystemStatus();
});

// Enhanced Storage System with multiple fallbacks
async function initializeEnhancedStorage() {
    try {
        // Try IndexedDB first
        db = await initializeDB();
        storageType = 'IndexedDB';
        console.log('✅ IndexedDB initialized successfully');
        updateStorageTypeDisplay('IndexedDB + File Export/Import');
    } catch (error) {
        console.log('📦 IndexedDB not available, trying localStorage...');
        try {
            // Test localStorage
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            storageType = 'localStorage';
            updateStorageTypeDisplay('localStorage + File Export/Import');
        } catch (localStorageError) {
            console.log('💾 localStorage not available, using memory + file storage');
            storageType = 'memory';
            updateStorageTypeDisplay('Memory + File Export/Import');
        }
    }
}

// Initialize IndexedDB
function initializeDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Create object stores
            if (!database.objectStoreNames.contains('topics')) {
                database.createObjectStore('topics', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('pdfs')) {
                database.createObjectStore('pdfs', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

// Enhanced storage functions with multiple fallbacks
async function saveToStorage(key, value) {
    try {
        if (db && storageType === 'IndexedDB') {
            const transaction = db.transaction(['pdfs'], 'readwrite');
            const store = transaction.objectStore('pdfs');
            
            const data = {
                id: key,
                data: value,
                timestamp: new Date().toISOString(),
                size: value ? new Blob([value]).size : 0
            };
            
            await new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log(`✅ Saved ${key} to IndexedDB (${(data.size / 1024).toFixed(1)} KB)`);
        } else if (storageType === 'localStorage') {
            localStorage.setItem(key, value);
            console.log(`📦 Saved ${key} to localStorage`);
        } else {
            // Memory storage fallback
            inMemoryStorage.set(key, {
                data: value,
                timestamp: new Date().toISOString(),
                size: value ? new Blob([value]).size : 0
            });
            console.log(`💾 Saved ${key} to memory storage`);
        }
    } catch (error) {
        console.error('Storage error:', error);
        // Ultimate fallback to memory
        inMemoryStorage.set(key, {
            data: value,
            timestamp: new Date().toISOString(),
            size: value ? new Blob([value]).size : 0
        });
        console.log(`💾 Fallback: Saved ${key} to memory storage`);
    }
}

async function getFromStorage(key) {
    try {
        if (db && storageType === 'IndexedDB') {
            const transaction = db.transaction(['pdfs'], 'readonly');
            const store = transaction.objectStore('pdfs');
            
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.data : null);
                };
                request.onerror = () => reject(request.error);
            });
        } else if (storageType === 'localStorage') {
            return localStorage.getItem(key);
        } else {
            // Memory storage fallback
            const item = inMemoryStorage.get(key);
            return item ? item.data : null;
        }
    } catch (error) {
        console.error('Storage retrieval error:', error);
        // Ultimate fallback to memory
        const item = inMemoryStorage.get(key);
        return item ? item.data : null;
    }
}

// Enhanced save data function
async function saveData() {
    try {
        if (db && storageType === 'IndexedDB') {
            const transaction = db.transaction(['topics'], 'readwrite');
            const store = transaction.objectStore('topics');
            
            const data = {
                id: STORAGE_KEY,
                data: topics,
                timestamp: new Date().toISOString(),
                version: '3.0'
            };
            
            await new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log('✅ Topics saved to IndexedDB');
        } else if (storageType === 'localStorage') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
            console.log('📦 Topics saved to localStorage');
        } else {
            // Memory storage fallback
            inMemoryStorage.set(STORAGE_KEY, {
                data: topics,
                timestamp: new Date().toISOString(),
                version: '3.0'
            });
            console.log('💾 Topics saved to memory storage');
        }
    } catch (error) {
        console.error('Error saving data:', error);
        // Ultimate fallback to memory
        inMemoryStorage.set(STORAGE_KEY, {
            data: topics,
            timestamp: new Date().toISOString(),
            version: '3.0'
        });
        console.log('💾 Fallback: Topics saved to memory storage');
    }
}

// Enhanced load data function
async function loadData() {
    try {
        if (db && storageType === 'IndexedDB') {
            const transaction = db.transaction(['topics'], 'readonly');
            const store = transaction.objectStore('topics');
            
            const result = await new Promise((resolve, reject) => {
                const request = store.get(STORAGE_KEY);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            if (result && result.data) {
                topics = result.data;
                console.log('✅ Topics loaded from IndexedDB');
                return;
            }
        } else if (storageType === 'localStorage') {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                topics = JSON.parse(savedData);
                console.log('📦 Topics loaded from localStorage');
                return;
            }
        } else {
            // Memory storage fallback
            const item = inMemoryStorage.get(STORAGE_KEY);
            if (item && item.data) {
                topics = item.data;
                console.log('💾 Topics loaded from memory storage');
                return;
            }
        }
        
        // If no data found, load defaults
        loadDefaultData();
        await saveData();
    } catch (error) {
        console.error('Error loading data:', error);
        loadDefaultData();
        await saveData();
    }
}

// File-based data export/import functions
async function exportAllData() {
    showLoading();
    
    try {
        // Collect all data including PDFs
        const exportData = {
            version: '3.0',
            timestamp: new Date().toISOString(),
            topics: topics,
            pdfs: {}
        };
        
        // Get all PDF data
        for (const topic of getAllTopicsFlat()) {
            if (topic.folderType === 'pdf-folder') {
                const pdfData = await getFromStorage(`pdf_${topic.id}`);
                if (pdfData) {
                    exportData.pdfs[topic.id] = pdfData;
                }
                
                const excelData = await getFromStorage(`excel_${topic.id}`);
                if (excelData) {
                    exportData.pdfs[`excel_${topic.id}`] = excelData;
                }
            }
        }
        
        // Create downloadable file
        const dataStr = JSON.stringify(exportData);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `asturi_backup_${new Date().toISOString().split('T')[0]}.asturi`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        hideLoading();
        alert('✅ Data exported successfully! Save the .asturi file to preserve your data.');
        
    } catch (error) {
        console.error('Export error:', error);
        hideLoading();
        alert('❌ Error exporting data: ' + error.message);
    }
}

function importData() {
    document.getElementById('import-modal').style.display = 'block';
}

function closeImportModal() {
    document.getElementById('import-modal').style.display = 'none';
    document.getElementById('import-input').value = '';
}

async function performImport() {
    const fileInput = document.getElementById('import-input');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file to import.');
        return;
    }
    
    showLoading();
    
    try {
        const fileContent = await readFileAsText(file);
        const importData = JSON.parse(fileContent);
        
        // Validate import data
        if (!importData.topics || !Array.isArray(importData.topics)) {
            throw new Error('Invalid data format');
        }
        
        // Import topics
        topics = importData.topics;
        await saveData();
        
        // Import PDFs if available
        if (importData.pdfs) {
            for (const [key, value] of Object.entries(importData.pdfs)) {
                await saveToStorage(key.startsWith('pdf_') || key.startsWith('excel_') ? key : `pdf_${key}`, value);
            }
        }
        
        // Re-render everything
        renderTopics();
        resetMainContent();
        
        hideLoading();
        closeImportModal();
        alert('✅ Data imported successfully!');
        
    } catch (error) {
        console.error('Import error:', error);
        hideLoading();
        alert('❌ Error importing data: ' + error.message);
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsText(file);
    });
}

function getAllTopicsFlat(topicsList = topics) {
    let flatList = [];
    for (let topic of topicsList) {
        flatList.push(topic);
        if (topic.subtopics) {
            flatList = flatList.concat(getAllTopicsFlat(topic.subtopics));
        }
    }
    return flatList;
}

// Enhanced storage information
async function getStorageInfo() {
    const info = {
        type: storageType,
        pdfCount: 0,
        totalSize: 0,
        avgSize: 0,
        topicCount: countAllItems({ subtopics: topics }) - 1,
        lastModified: null,
        quota: null,
        usage: null
    };

    try {
        if (db && storageType === 'IndexedDB') {
            const transaction = db.transaction(['pdfs'], 'readonly');
            const store = transaction.objectStore('pdfs');
            
            const allPDFs = await new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
            
            info.pdfCount = allPDFs.length;
            info.totalSize = allPDFs.reduce((sum, pdf) => sum + (pdf.size || 0), 0);
            info.avgSize = info.pdfCount > 0 ? info.totalSize / info.pdfCount : 0;
            
            if (allPDFs.length > 0) {
                info.lastModified = Math.max(...allPDFs.map(pdf => new Date(pdf.timestamp).getTime()));
            }
            
            // Get storage quota if available
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                info.quota = estimate.quota;
                info.usage = estimate.usage;
            }
        } else if (storageType === 'localStorage') {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('pdf_'));
            info.pdfCount = keys.length;
            
            let totalSize = 0;
            keys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) totalSize += new Blob([data]).size;
            });
            
            info.totalSize = totalSize;
            info.avgSize = info.pdfCount > 0 ? totalSize / info.pdfCount : 0;
        } else {
            // Memory storage
            const keys = Array.from(inMemoryStorage.keys()).filter(key => key.startsWith('pdf_'));
            info.pdfCount = keys.length;
            
            let totalSize = 0;
            keys.forEach(key => {
                const item = inMemoryStorage.get(key);
                if (item) totalSize += item.size || 0;
            });
            
            info.totalSize = totalSize;
            info.avgSize = info.pdfCount > 0 ? totalSize / info.pdfCount : 0;
        }
    } catch (error) {
        console.error('Error getting storage info:', error);
    }

    return info;
}

// Update storage type display
function updateStorageTypeDisplay(type) {
    const storageTypeEl = document.getElementById('storage-type');
    if (storageTypeEl) {
        storageTypeEl.textContent = type;
    }
}

// Show enhanced system status
async function showEnhancedSystemStatus() {
    console.log('🚀 ASTURI Enhanced System Active:');
    console.log(`💾 Storage: ${storageType}`);
    console.log('📁 File export/import available');
    console.log('🔄 Auto-save enabled');
    
    const info = await getStorageInfo();
    if (info.topicCount > 0 || info.pdfCount > 0) {
        console.log(`📊 Current data: ${info.topicCount} items, ${info.pdfCount} PDFs saved`);
        if (info.totalSize > 0) {
            console.log(`💽 Total size: ${formatBytes(info.totalSize)}`);
        }
    }
    
    if (info.quota) {
        const usagePercent = ((info.usage / info.quota) * 100).toFixed(1);
        console.log(`🗄️ Storage usage: ${usagePercent}% (${formatBytes(info.usage)} / ${formatBytes(info.quota)})`);
    }
}

// Show storage information modal
async function showStorageInfo() {
    const info = await getStorageInfo();
    const modal = document.getElementById('storage-modal');
    const details = document.getElementById('storage-details');
    
    let quotaInfo = '';
    if (info.quota) {
        const usagePercent = ((info.usage / info.quota) * 100).toFixed(1);
        const usageClass = usagePercent > 80 ? 'storage-warning' : 'storage-success';
        quotaInfo = `
            <div class="storage-stat ${usageClass}">
                <span class="storage-stat-label">Storage Usage</span>
                <span class="storage-stat-value">${usagePercent}%</span>
            </div>
            <div class="storage-stat">
                <span class="storage-stat-label">Available Space</span>
                <span class="storage-stat-value">${formatBytes(info.quota - info.usage)}</span>
            </div>
        `;
    }
    
    details.innerHTML = `
        <div class="storage-stat">
            <span class="storage-stat-label">Storage Type</span>
            <span class="storage-stat-value">${info.type}</span>
        </div>
        <div class="storage-stat">
            <span class="storage-stat-label">Total Topics</span>
            <span class="storage-stat-value">${info.topicCount}</span>
        </div>
        <div class="storage-stat">
            <span class="storage-stat-label">Uploaded PDFs</span>
            <span class="storage-stat-value">${info.pdfCount}</span>
        </div>
        <div class="storage-stat">
            <span class="storage-stat-label">Total PDF Size</span>
            <span class="storage-stat-value">${formatBytes(info.totalSize)}</span>
        </div>
        ${info.pdfCount > 0 ? `
        <div class="storage-stat">
            <span class="storage-stat-label">Average PDF Size</span>
            <span class="storage-stat-value">${formatBytes(info.avgSize)}</span>
        </div>
        ` : ''}
        ${quotaInfo}
        ${info.lastModified ? `
        <div class="storage-stat">
            <span class="storage-stat-label">Last PDF Upload</span>
            <span class="storage-stat-value">${formatDate(new Date(info.lastModified).toISOString())}</span>
        </div>
        ` : ''}
        <div class="storage-stat">
            <span class="storage-stat-label">Export Available</span>
            <span class="storage-stat-value">✅ Yes</span>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeStorageModal() {
    document.getElementById('storage-modal').style.display = 'none';
}

// Utility function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Setup context menu for rename functionality
function setupContextMenu() {
    document.addEventListener('contextmenu', function(e) {
        // Check if right-clicked on a topic or subtopic
        const topicHeader = e.target.closest('.topic-header');
        const subtopic = e.target.closest('.subtopic');
        
        if (topicHeader || subtopic) {
            e.preventDefault();
            showContextMenu(e, topicHeader, subtopic);
        }
    });
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', function() {
        hideContextMenu();
    });
}

function showContextMenu(e, topicHeader, subtopic) {
    hideContextMenu(); // Hide any existing context menu
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="initiateRename(event)">
            <i class="fas fa-edit"></i> Rename
        </div>
    `;
    
    // Store the target for renaming
    if (topicHeader) {
        const topicDiv = topicHeader.closest('.topic');
        renameTargetId = getTopicIdFromElement(topicHeader);
        renameTargetType = 'topic';
    } else if (subtopic) {
        renameTargetId = getSubtopicIdFromElement(subtopic);
        renameTargetType = 'subtopic';
    }
    
    // Position the context menu
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
    
    document.body.appendChild(contextMenu);
}

function hideContextMenu() {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

function getTopicIdFromElement(element) {
    // Extract ID from onclick attribute or data attribute
    const controls = element.querySelector('.topic-controls');
    if (controls) {
        const deleteBtn = controls.querySelector('.control-btn[title="Delete"]');
        if (deleteBtn) {
            const onclick = deleteBtn.getAttribute('onclick');
            const match = onclick.match(/deleteTopic\((\d+)\)/);
            if (match) return parseInt(match[1]);
        }
    }
    return null;
}

function getSubtopicIdFromElement(element) {
    // Extract ID from onclick attribute
    const controls = element.querySelector('.subtopic-controls');
    if (controls) {
        const deleteBtn = controls.querySelector('.control-btn[title="Delete"]');
        if (deleteBtn) {
            const onclick = deleteBtn.getAttribute('onclick');
            const match = onclick.match(/deleteSubtopic\((\d+),/);
            if (match) return parseInt(match[1]);
        }
    }
    return null;
}

function initiateRename(e) {
    e.stopPropagation();
    hideContextMenu();
    
    if (renameTargetId && renameTargetType) {
        const target = findTopicById(renameTargetId);
        if (target) {
            document.getElementById('rename-input').value = target.name;
            document.getElementById('rename-modal').style.display = 'block';
            document.getElementById('rename-input').focus();
            document.getElementById('rename-input').select();
        }
    }
}

function closeRenameModal() {
    document.getElementById('rename-modal').style.display = 'none';
    renameTargetId = null;
    renameTargetType = null;
}

async function confirmRename() {
    const newName = document.getElementById('rename-input').value.trim();
    if (newName && renameTargetId && renameTargetType) {
        const target = findTopicById(renameTargetId);
        if (target) {
            target.name = newName;
            target.lastModified = new Date().toISOString();
            await saveData();
            renderTopics();
            
            // Update main content if currently selected
            if (currentSubtopicId === renameTargetId) {
                document.getElementById('content-title').textContent = newName;
                document.getElementById('report-title').textContent = newName;
            }
        }
    }
    closeRenameModal();
}

// Setup modal radio button handlers
function setupModalHandlers() {
    // Topic modal radio buttons
    const topicRadios = document.querySelectorAll('input[name="topic-type"]');
    topicRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateRadioSelection('topic-type');
        });
    });
    
    // Subtopic modal radio buttons
    const subtopicRadios = document.querySelectorAll('input[name="subtopic-type"]');
    subtopicRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateRadioSelection('subtopic-type');
        });
    });
}

// Update radio button visual selection
function updateRadioSelection(radioName) {
    const radios = document.querySelectorAll(`input[name="${radioName}"]`);
    radios.forEach(radio => {
        const option = radio.closest('.radio-option');
        if (radio.checked) {
            option.classList.add('checked');
        } else {
            option.classList.remove('checked');
        }
    });
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load default data (specific to ASTURI business requirements)
function loadDefaultData() {
    const now = new Date().toISOString();
    
    topics = [
        {
            id: 1,
            name: "STANDARD FORMAT FOR FINANCE",
            icon: "fas fa-folder",
            expanded: true,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 11,
                    name: "PROFIT & LOSS STATEMENT",
                    description: "Comprehensive profit and loss financial statement",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 12,
                    name: "BALANCE SHEET",
                    description: "Complete balance sheet report",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        },
        {
            id: 2,
            name: "REPORT FOR REVENUE",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 21,
                    name: "Summary of Property Rental",
                    description: "Comprehensive property rental revenue summary",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        },
        {
            id: 3,
            name: "REPORT FOR INVOICE & PAYMENT RECEIVED",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 31,
                    name: "Rental Lot 74-A, Gebeng",
                    description: "Invoice and payment tracking for Lot 74-A, Gebeng",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 32,
                    name: "Rental Lot 3/129, Gebeng",
                    description: "Invoice and payment tracking for Lot 3/129, Gebeng",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 33,
                    name: "Rental Land, Gebeng",
                    description: "Invoice and payment tracking for Land, Gebeng",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 34,
                    name: "Rental Bangi",
                    description: "Invoice and payment tracking for Bangi property",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 35,
                    name: "Rental Jalan Kuching - Blok 3",
                    description: "Invoice and payment tracking for Jalan Kuching Blok 3",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 36,
                    name: "Rental Jalan Kuching - Blok 3A",
                    description: "Invoice and payment tracking for Jalan Kuching Blok 3A",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 37,
                    name: "Rental Short Term Rental",
                    description: "Invoice and payment tracking for short term rentals",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 38,
                    name: "Rental of Equipment",
                    description: "Invoice and payment tracking for equipment rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 39,
                    name: "Rental Others",
                    description: "Invoice and payment tracking for other rental services",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        },
        {
            id: 4,
            name: "REPORT FOR COST OF SALES",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 41,
                    name: "Rental Lot 74-A, Gebeng",
                    description: "Cost of sales for Lot 74-A, Gebeng rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 42,
                    name: "Rental Lot 3/129, Gebeng",
                    description: "Cost of sales for Lot 3/129, Gebeng rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 43,
                    name: "Rental Land, Gebeng",
                    description: "Cost of sales for Land, Gebeng rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 44,
                    name: "Rental Bangi",
                    description: "Cost of sales for Bangi rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 45,
                    name: "Rental Jalan Kuching - Blok 3",
                    description: "Cost of sales for Jalan Kuching Blok 3 rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 46,
                    name: "Rental Jalan Kuching - Blok 3A",
                    description: "Cost of sales for Jalan Kuching Blok 3A rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 47,
                    name: "Rental Short Term Rental",
                    description: "Cost of sales for short term rentals",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 48,
                    name: "Rental of Equipment",
                    description: "Cost of sales for equipment rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 49,
                    name: "Rental Others",
                    description: "Cost of sales for other rental services",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        },
        {
            id: 5,
            name: "REPORT FOR EXPENSES",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 51,
                    name: "Salary & Expenses",
                    description: "Salary and expense management folder",
                    folderType: "folder",
                    expanded: false,
                    createdDate: now,
                    subtopics: [
                        {
                            id: 511,
                            name: "Summary Salary & Salary Expenses",
                            description: "Summary of all salary and salary-related expenses",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 512,
                            name: "Details - Salary",
                            description: "Detailed salary breakdown",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 513,
                            name: "Details - Salary Expenses",
                            description: "Detailed salary-related expenses",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        }
                    ]
                },
                {
                    id: 52,
                    name: "Utilities & Maintenance",
                    description: "Utilities and maintenance expenses folder",
                    folderType: "folder",
                    expanded: false,
                    createdDate: now,
                    subtopics: [
                        {
                            id: 521,
                            name: "Details - Utilities",
                            description: "Detailed utilities expenses breakdown",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 522,
                            name: "Details - Maintenance and Purchase Order",
                            description: "Detailed maintenance and purchase order expenses",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 523,
                            name: "Maintenance and Purchase Order (Buildings)",
                            description: "Building maintenance: Lot 74-A Office + Factory 1-13, Lot 3/129, Lot 55/129 (Kilang 8), Boulevard Business Park Jalan Kuching, Plaza Paragon Point Bangi",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        }
                    ]
                },
                {
                    id: 53,
                    name: "Taxes & Legal",
                    description: "Tax and legal expenses folder",
                    folderType: "folder",
                    expanded: false,
                    createdDate: now,
                    subtopics: [
                        {
                            id: 531,
                            name: "Details - Cukai Tanah & Cukai Taksiran",
                            description: "Land tax and assessment tax details",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 532,
                            name: "Cukai Tanah (Land Tax)",
                            description: "Land tax for: Lot 74-A Office + Factory 1-13, Lot 3/129, Lot 55/129 (Kilang 8)",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 533,
                            name: "Cukai Taksiran (Assessment Tax)",
                            description: "Assessment tax for: Boulevard Business Park Jalan Kuching, Plaza Paragon Point Bangi, Lot 55/129 (Kilang 8)",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 534,
                            name: "Details - Legal & Consultancy",
                            description: "Legal and consultancy fee expenses",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        }
                    ]
                }
            ]
        },
        {
            id: 6,
            name: "FORMAT ADDITIONAL FORMS",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 61,
                    name: "Payment Forms",
                    description: "Payment related forms and templates",
                    folderType: "folder",
                    expanded: false,
                    createdDate: now,
                    subtopics: [
                        {
                            id: 611,
                            name: "PROPOSED PAYMENT FOR APPROVAL - GENERAL",
                            description: "General payment approval form",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 612,
                            name: "PROPOSED PAYMENT FOR APPROVAL - SALARY",
                            description: "Salary payment approval form",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 613,
                            name: "PROPOSED PAYMENT FOR APPROVAL - UTILITY",
                            description: "Utility payment approval form",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 614,
                            name: "PAYMENT REQUEST",
                            description: "Payment request form template",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        }
                    ]
                },
                {
                    id: 62,
                    name: "Invoice & Receipt Forms",
                    description: "Invoice and receipt templates",
                    folderType: "folder",
                    expanded: false,
                    createdDate: now,
                    subtopics: [
                        {
                            id: 621,
                            name: "INVOICE",
                            description: "Invoice template form",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 622,
                            name: "OFFICIAL RECEIPT",
                            description: "Official receipt template form",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 623,
                            name: "SUMMARY INVOICE LISTING",
                            description: "Summary of all invoice listings",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 624,
                            name: "SUMMARY OFFICIAL RECEIPT",
                            description: "Summary of all official receipts",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        }
                    ]
                }
            ]
        },
        {
            id: 7,
            name: "ASSETS",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 71,
                    name: "LIST OF ASSETS",
                    description: "Complete list of 19 company assets",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 72,
                    name: "ASSET LISTING",
                    description: "Detailed asset listing (19 items - to be filled by Asturi staff)",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        },
        {
            id: 8,
            name: "VEHICLE MANAGEMENT",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 81,
                    name: "Vehicle Maintenance & Servicing",
                    description: "Vehicle maintenance and servicing records",
                    folderType: "folder",
                    expanded: false,
                    createdDate: now,
                    subtopics: [
                        {
                            id: 811,
                            name: "ASTURI RESOURCES - Maintenance & Servicing",
                            description: "Vehicle maintenance and servicing expenses for Asturi Resources",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 812,
                            name: "ASTURI TRUCK & CRANE - Maintenance & Servicing",
                            description: "Vehicle maintenance and servicing expenses for Asturi Truck & Crane",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 813,
                            name: "PERSONAL VEHICLES - Maintenance & Servicing",
                            description: "Personal vehicle maintenance and servicing expenses",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        }
                    ]
                },
                {
                    id: 82,
                    name: "Vehicle Road Tax & Insurance",
                    description: "Vehicle road tax and insurance records",
                    folderType: "folder",
                    expanded: false,
                    createdDate: now,
                    subtopics: [
                        {
                            id: 821,
                            name: "ASTURI RESOURCES - Road Tax & Insurance",
                            description: "Vehicle road tax and insurance expenses for Asturi Resources",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 822,
                            name: "ASTURI TRUCK & CRANE - Road Tax & Insurance",
                            description: "Vehicle road tax and insurance expenses for Asturi Truck & Crane",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        },
                        {
                            id: 823,
                            name: "PERSONAL VEHICLES - Road Tax & Insurance",
                            description: "Personal vehicle road tax and insurance expenses",
                            folderType: "pdf-folder",
                            expanded: false,
                            createdDate: now
                        }
                    ]
                }
            ]
        }
    ];
}

// Generate unique ID
function generateId() {
    return Date.now() + Math.random();
}

// Render all topics
function renderTopics() {
    const container = document.getElementById('topics-container');
    container.innerHTML = '';
    
    if (topics.length === 0) {
        container.innerHTML = `
            <div class="empty-topics">
                <i class="fas fa-folder-open"></i>
                <p>No topics yet. Click "Add Topic" to create your first folder or report.</p>
            </div>
        `;
        return;
    }
    
    topics.forEach(topic => {
        const topicElement = createTopicElement(topic, 0);
        container.appendChild(topicElement);
    });
}

// Create topic element with enhanced folder type support and date tracking
function createTopicElement(topic, level = 0) {
    const topicDiv = document.createElement('div');
    topicDiv.className = `topic ${level > 0 ? `nested-topic level-${level}` : ''}`;
    
    const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
    const canExpand = hasSubtopics;
    const folderType = topic.folderType || 'folder';
    const isClickable = folderType === 'pdf-folder';
    
    // Determine emoji based on folder type
    let emoji = '📁';
    if (folderType === 'pdf-folder') {
        emoji = '📄';
    }
    
    // Format dates
    const createdDate = topic.createdDate ? formatDate(topic.createdDate) : '';
    const uploadDate = topic.uploadDate ? formatDate(topic.uploadDate) : '';
    
    topicDiv.innerHTML = `
        <div class="topic-header ${folderType === 'folder' ? 'folder' : ''}" 
             onclick="${isClickable ? `selectSubtopic(${topic.id}, ${topic.id})` : `toggleTopic(${topic.id})`}">
            <div class="topic-title">
                ${canExpand ? `<span class="expand-icon ${topic.expanded ? 'expanded' : ''}" onclick="event.stopPropagation(); toggleTopic(${topic.id})">▼</span>` : '<span style="width: 16px;"></span>'}
                <span class="folder-emoji">${emoji}</span>
                <div class="topic-info">
                    <span class="topic-name">${topic.name}</span>
                    <div class="topic-dates">
                        ${createdDate ? `<div class="created-info"><i class="fas fa-plus"></i> ${createdDate}</div>` : ''}
                        ${uploadDate ? `<div class="upload-info"><i class="fas fa-upload"></i> ${uploadDate}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="topic-controls">
                <button class="control-btn" onclick="event.stopPropagation(); addSubtopic(${topic.id})" title="Add Item">+</button>
                <button class="control-btn" onclick="event.stopPropagation(); deleteTopic(${topic.id})" title="Delete">×</button>
            </div>
        </div>
        <div class="subtopics ${topic.expanded ? 'expanded' : ''}" id="subtopics-${topic.id}">
            ${hasSubtopics ? topic.subtopics.map(subtopic => createSubtopicElement(subtopic, topic.id, level + 1)).join('') : ''}
        </div>
    `;
    
    return topicDiv;
}

// Create subtopic element with enhanced nesting, folder type support and date tracking
function createSubtopicElement(subtopic, parentId, level = 1) {
    const hasSubtopics = subtopic.subtopics && subtopic.subtopics.length > 0;
    const canExpand = hasSubtopics;
    const indentLevel = Math.min(level * 20, 100); // Cap at 100px for deep nesting
    const folderType = subtopic.folderType || 'pdf-folder';
    const isClickable = folderType === 'pdf-folder';
    
    // Determine emoji based on folder type
    let emoji = '📄';
    if (folderType === 'folder') {
        emoji = '📁';
    }
    
    // Format dates
    const createdDate = subtopic.createdDate ? formatDate(subtopic.createdDate) : '';
    const uploadDate = subtopic.uploadDate ? formatDate(subtopic.uploadDate) : '';
    
    return `
        <div class="subtopic-container" style="margin-left: ${indentLevel}px;">
            <div class="subtopic ${currentSubtopicId === subtopic.id ? 'active' : ''}" 
                 onclick="${isClickable ? `selectSubtopic(${subtopic.id}, ${parentId})` : ''}">
                <div class="subtopic-info">
                    <div class="subtopic-header">
                        ${canExpand ? `<span class="expand-icon ${subtopic.expanded ? 'expanded' : ''}" onclick="event.stopPropagation(); toggleSubtopic(${subtopic.id})">▼</span>` : '<span style="width: 14px;"></span>'}
                        <span class="subtopic-icon">${emoji}</span>
                        <span class="subtopic-title">${subtopic.name}</span>
                    </div>
                    ${subtopic.description ? `<div class="subtopic-desc">${subtopic.description}</div>` : ''}
                    <div class="subtopic-dates">
                        ${createdDate ? `<div class="created-info"><i class="fas fa-plus"></i> ${createdDate}</div>` : ''}
                        ${uploadDate ? `<div class="upload-info"><i class="fas fa-upload"></i> ${uploadDate}</div>` : ''}
                    </div>
                </div>
                <div class="subtopic-controls">
                    ${folderType === 'folder' ? `<button class="control-btn" onclick="event.stopPropagation(); addSubtopic(${subtopic.id})" title="Add Sub-item">+</button>` : ''}
                    <button class="control-btn" onclick="event.stopPropagation(); deleteSubtopic(${subtopic.id}, ${parentId})" title="Delete">×</button>
                </div>
            </div>
            ${hasSubtopics ? `
                <div class="nested-subtopics ${subtopic.expanded ? 'expanded' : ''}" id="subtopics-${subtopic.id}">
                    ${subtopic.subtopics.map(nestedSub => createSubtopicElement(nestedSub, subtopic.id, level + 1)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Toggle topic expansion
async function toggleTopic(topicId) {
    const topic = findTopicById(topicId);
    if (topic && (topic.subtopics && topic.subtopics.length > 0)) {
        topic.expanded = !topic.expanded;
        await saveData();
        renderTopics();
    }
}

// Toggle subtopic expansion
async function toggleSubtopic(subtopicId) {
    const subtopic = findTopicById(subtopicId);
    if (subtopic && subtopic.subtopics && subtopic.subtopics.length > 0) {
        subtopic.expanded = !subtopic.expanded;
        await saveData();
        renderTopics();
    }
}

// Find topic by ID (recursive search)
function findTopicById(id, topicsList = topics) {
    for (let topic of topicsList) {
        if (topic.id === id) {
            return topic;
        }
        if (topic.subtopics) {
            const found = findTopicById(id, topic.subtopics);
            if (found) return found;
        }
    }
    return null;
}

// Find parent topic of a subtopic
function findParentTopic(subtopicId, topicsList = topics) {
    for (let topic of topicsList) {
        if (topic.subtopics) {
            for (let subtopic of topic.subtopics) {
                if (subtopic.id === subtopicId) {
                    return topic;
                }
                if (subtopic.subtopics) {
                    const found = findParentTopic(subtopicId, topic.subtopics);
                    if (found) return found;
                }
            }
        }
    }
    return null;
}

// Select subtopic (only for PDF folders)
async function selectSubtopic(subtopicId, topicId) {
    const subtopic = findTopicById(subtopicId);
    if (!subtopic || subtopic.folderType !== 'pdf-folder') {
        console.log('Only PDF folders can be selected for viewing');
        return;
    }
    
    currentSubtopicId = subtopicId;
    currentTopicId = topicId;
    
    // Update header
    document.getElementById('content-title').textContent = subtopic.name;
    document.getElementById('content-subtitle').textContent = subtopic.description || 'PDF document folder';
    
    // Show report view
    document.getElementById('content-body').style.display = 'none';
    const reportView = document.getElementById('report-view');
    reportView.style.display = 'block';
    
    // Update report view content
    document.getElementById('report-title').textContent = subtopic.name;
    document.getElementById('report-description').textContent = subtopic.description || 'PDF document folder';
    
    // Update dates in report meta
    const reportMeta = document.getElementById('report-meta');
    const createdDateEl = document.getElementById('created-date');
    const uploadDateEl = document.getElementById('upload-date');
    
    if (subtopic.createdDate) {
        createdDateEl.innerHTML = `<i class="fas fa-plus"></i> Created: ${formatDate(subtopic.createdDate)}`;
        createdDateEl.style.display = 'flex';
    } else {
        createdDateEl.style.display = 'none';
    }
    
    if (subtopic.uploadDate) {
        uploadDateEl.innerHTML = `<i class="fas fa-upload"></i> PDF Uploaded: ${formatDate(subtopic.uploadDate)}`;
        uploadDateEl.style.display = 'flex';
    } else {
        uploadDateEl.style.display = 'none';
    }
    
    // Check if this subtopic has a saved PDF
    const savedPDF = await getFromStorage(`pdf_${subtopicId}`);
    if (savedPDF) {
        loadSavedPDF(savedPDF);
        // Hide the report icon when PDF is loaded
        document.getElementById('report-icon').classList.add('pdf-uploaded');
    } else {
        // Reset PDF viewer
        document.getElementById('pdf-viewer').style.display = 'none';
        document.getElementById('upload-section').style.display = 'block';
        document.getElementById('excel-btn').style.display = 'none';
        // Show the report icon when no PDF
        document.getElementById('report-icon').classList.remove('pdf-uploaded');
    }
    
    // Re-render to update active state
    renderTopics();
}

// Add topic
function addTopic() {
    document.getElementById('topic-modal').style.display = 'block';
    document.getElementById('topic-name').value = '';
    
    // Reset radio buttons to default (folder)
    document.getElementById('type-folder').checked = true;
    document.getElementById('type-pdf-folder').checked = false;
    updateRadioSelection('topic-type');
    
    document.getElementById('topic-name').focus();
}

// Create topic with enhanced folder type support and date tracking
async function createTopic() {
    const name = document.getElementById('topic-name').value.trim();
    const folderType = document.querySelector('input[name="topic-type"]:checked').value;
    
    if (name) {
        const newId = generateId();
        const now = new Date().toISOString();
        const newTopic = {
            id: newId,
            name: name.toUpperCase(),
            icon: folderType === 'folder' ? "fas fa-folder" : "fas fa-file-pdf",
            expanded: false,
            folderType: folderType,
            createdDate: now
        };
        
        // Only add subtopics array for folders
        if (folderType === 'folder') {
            newTopic.subtopics = [];
        }
        
        topics.push(newTopic);
        await saveData();
        renderTopics();
        closeModal();
    }
}

// Add subtopic
function addSubtopic(topicId) {
    const parentTopic = findTopicById(topicId);
    if (!parentTopic) return;
    
    // Check if parent can contain subtopics
    if (parentTopic.folderType === 'pdf-folder') {
        alert('PDF folders cannot contain sub-items. Only regular folders can contain other items.');
        return;
    }
    
    currentTopicId = topicId;
    document.getElementById('subtopic-modal').style.display = 'block';
    document.getElementById('subtopic-name').value = '';
    document.getElementById('subtopic-description').value = '';
    
    // Reset radio buttons to default (folder)
    document.getElementById('subtype-folder').checked = true;
    document.getElementById('subtype-pdf-folder').checked = false;
    updateRadioSelection('subtopic-type');
    
    document.getElementById('subtopic-name').focus();
}

// Create subtopic with enhanced folder type support and date tracking
async function createSubtopic() {
    const name = document.getElementById('subtopic-name').value.trim();
    const description = document.getElementById('subtopic-description').value.trim() || 'No description provided';
    const folderType = document.querySelector('input[name="subtopic-type"]:checked').value;
    
    if (name && currentTopicId) {
        const parentTopic = findTopicById(currentTopicId);
        if (parentTopic) {
            // Initialize subtopics array if it doesn't exist
            if (!parentTopic.subtopics) {
                parentTopic.subtopics = [];
            }
            
            const newId = generateId();
            const now = new Date().toISOString();
            const newSubtopic = {
                id: newId,
                name: name,
                description: description,
                folderType: folderType,
                expanded: false,
                createdDate: now
            };
            
            // Only add subtopics array for folders
            if (folderType === 'folder') {
                newSubtopic.subtopics = [];
            }
            
            parentTopic.subtopics.push(newSubtopic);
            await saveData();
            renderTopics();
            closeSubtopicModal();
        }
    }
}

// Delete topic with enhanced error handling
async function deleteTopic(topicId) {
    const topic = findTopicById(topicId);
    if (!topic) return;
    
    const itemCount = countAllItems(topic);
    const confirmMessage = itemCount > 1 ? 
        `Are you sure you want to delete this item and all ${itemCount - 1} sub-items?` :
        'Are you sure you want to delete this item?';
    
    if (confirm(confirmMessage)) {
        // Remove from topics array (recursive)
        function removeFromArray(arr) {
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].id === topicId) {
                    arr.splice(i, 1);
                    return true;
                }
                if (arr[i].subtopics && removeFromArray(arr[i].subtopics)) {
                    return true;
                }
            }
            return false;
        }
        
        removeFromArray(topics);
        
        if (currentTopicId === topicId || currentSubtopicId === topicId) {
            resetMainContent();
        }
        await saveData();
        renderTopics();
    }
}

// Delete subtopic with enhanced error handling
async function deleteSubtopic(subtopicId, parentId) {
    const subtopic = findTopicById(subtopicId);
    if (!subtopic) return;
    
    const itemCount = countAllItems(subtopic);
    const confirmMessage = itemCount > 1 ? 
        `Are you sure you want to delete this item and all ${itemCount - 1} sub-items?` :
        'Are you sure you want to delete this item?';
    
    if (confirm(confirmMessage)) {
        // Find and remove the subtopic recursively
        function removeSubtopicRecursive(items) {
            if (!items) return false;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === subtopicId) {
                    items.splice(i, 1);
                    return true;
                }
                if (items[i].subtopics && removeSubtopicRecursive(items[i].subtopics)) {
                    return true;
                }
            }
            return false;
        }
        
        // Start from the parent topic
        const parentTopic = findTopicById(parentId);
        if (parentTopic && parentTopic.subtopics) {
            removeSubtopicRecursive(parentTopic.subtopics);
        } else {
            // If not found in parent, search all topics
            for (let topic of topics) {
                if (removeSubtopicRecursive(topic.subtopics)) {
                    break;
                }
            }
        }
        
        if (currentSubtopicId === subtopicId) {
            resetMainContent();
        }
        await saveData();
        renderTopics();
    }
}

// Helper function to count all items in a tree
function countAllItems(item) {
    let count = 1; // Count the item itself
    if (item.subtopics) {
        for (let subtopic of item.subtopics) {
            count += countAllItems(subtopic);
        }
    }
    return count;
}

// Reset main content
function resetMainContent() {
    currentTopicId = null;
    currentSubtopicId = null;
    currentPDF = null;
    document.getElementById('content-title').textContent = 'Select a Report';
    document.getElementById('content-subtitle').textContent = 'Choose a PDF folder from the sidebar to get started';
    document.getElementById('content-body').style.display = 'block';
    document.getElementById('report-view').style.display = 'none';
    document.getElementById('pdf-viewer').style.display = 'none';
    document.getElementById('upload-section').style.display = 'block';
    document.getElementById('report-icon').classList.remove('pdf-uploaded');
}

// PDF Upload and handling
function uploadPDF() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    document.getElementById('pdf-input').click();
}

function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        handlePDFFile(file);
    } else {
        alert('Please select a valid PDF file.');
    }
    
    // Reset the input
    event.target.value = '';
}

async function handlePDFFile(file) {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const arrayBuffer = e.target.result;
        const typedarray = new Uint8Array(arrayBuffer);
        
        try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            pdfDoc = pdf;
            pageCount = pdf.numPages;
            pageNum = 1;
            
            // Save PDF to enhanced storage as base64
            const base64String = btoa(String.fromCharCode.apply(null, typedarray));
            await saveToStorage(`pdf_${currentSubtopicId}`, base64String);
            
            // Update upload date for the current subtopic
            const subtopic = findTopicById(currentSubtopicId);
            if (subtopic) {
                subtopic.uploadDate = new Date().toISOString();
                subtopic.lastModified = new Date().toISOString();
                await saveData();
                renderTopics();
                
                // Update upload date in report view
                const uploadDateEl = document.getElementById('upload-date');
                uploadDateEl.innerHTML = `<i class="fas fa-upload"></i> PDF Uploaded: ${formatDate(subtopic.uploadDate)}`;
                uploadDateEl.style.display = 'flex';
            }
            
            // Hide folder icon and show PDF viewer
            document.getElementById('report-icon').classList.add('pdf-uploaded');
            document.getElementById('upload-section').style.display = 'none';
            document.getElementById('pdf-viewer').style.display = 'block';
            document.getElementById('excel-btn').style.display = 'inline-flex';
            
            renderPage(pageNum);
            hideLoading();
            
            // Show enhanced success message
            const subtopicName = subtopic ? subtopic.name : 'PDF';
            const fileSize = formatBytes(file.size);
            alert(`✅ PDF uploaded successfully to "${subtopicName}"!\n\n💾 Storage: ${storageType}\n📊 File size: ${fileSize}\n🔄 Auto-saved. Use Export Data to preserve between sessions.`);
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file: ' + error.message);
            hideLoading();
        }
    };
    
    reader.onerror = function() {
        alert('Error reading PDF file.');
        hideLoading();
    };
    
    reader.readAsArrayBuffer(file);
}

function loadSavedPDF(savedPDF) {
    showLoading();
    
    try {
        let arrayBuffer;
        
        // Handle different saved PDF formats
        if (typeof savedPDF === 'string') {
            // If it's base64 encoded
            if (savedPDF.startsWith('data:')) {
                const base64Data = savedPDF.split(',')[1];
                const binaryString = atob(base64Data);
                arrayBuffer = new ArrayBuffer(binaryString.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
            } else {
                // Try to decode as base64
                const binaryString = atob(savedPDF);
                arrayBuffer = new ArrayBuffer(binaryString.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
            }
        } else {
            // If it's already an ArrayBuffer or similar
            arrayBuffer = savedPDF;
        }
        
        const typedarray = new Uint8Array(arrayBuffer);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            pageCount = pdf.numPages;
            pageNum = 1;
            
            // Hide folder icon and show PDF viewer
            document.getElementById('report-icon').classList.add('pdf-uploaded');
            document.getElementById('upload-section').style.display = 'none';
            document.getElementById('pdf-viewer').style.display = 'block';
            document.getElementById('excel-btn').style.display = 'inline-flex';
            
            renderPage(pageNum);
            hideLoading();
        }).catch(function(error) {
            console.error('Error loading saved PDF:', error);
            // Clear invalid saved PDF
            saveToStorage(`pdf_${currentSubtopicId}`, null);
            hideLoading();
        });
    } catch (error) {
        console.error('Error processing saved PDF:', error);
        // Clear invalid saved PDF
        if (currentSubtopicId) {
            saveToStorage(`pdf_${currentSubtopicId}`, null);
        }
        hideLoading();
    }
}

// PDF rendering functions
function renderPage(num) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderContext);
        
        // Update page info
        document.getElementById('page-info').textContent = `Page ${num} of ${pageCount}`;
    });
}

function prevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    renderPage(pageNum);
}

function nextPage() {
    if (pageNum >= pageCount) return;
    pageNum++;
    renderPage(pageNum);
}

function zoomIn() {
    scale += 0.2;
    renderPage(pageNum);
}

function zoomOut() {
    if (scale <= 0.4) return;
    scale -= 0.2;
    renderPage(pageNum);
}

// Convert PDF to Excel
async function convertToExcel() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    if (!pdfDoc) {
        alert('Please upload a PDF first.');
        return;
    }
    
    showLoading();
    
    // Extract text from PDF and convert to Excel
    extractPDFText().then(async function(textData) {
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(textData);
            XLSX.utils.book_append_sheet(wb, ws, 'PDF_Data');
            
            // Save Excel file as base64
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const excelBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(excelBuffer)));
            await saveToStorage(`excel_${currentSubtopicId}`, excelBase64);
            
            hideLoading();
            alert('PDF converted to Excel successfully! Click "Download Excel" to save the file.');
        } catch (error) {
            console.error('Error creating Excel file:', error);
            hideLoading();
            alert('Error converting PDF to Excel: ' + error.message);
        }
    }).catch(function(error) {
        console.error('Error converting PDF to Excel:', error);
        alert('Error converting PDF to Excel: ' + error.message);
        hideLoading();
    });
}

async function extractPDFText() {
    const textData = [];
    
    try {
        // Add headers
        textData.push(['Page', 'Content']);
        
        for (let i = 1; i <= pageCount; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            
            let pageText = '';
            textContent.items.forEach(item => {
                if (item.str && item.str.trim()) {
                    pageText += item.str + ' ';
                }
            });
            
            // Add page data as a row
            if (pageText.trim()) {
                textData.push([`Page ${i}`, pageText.trim()]);
            } else {
                textData.push([`Page ${i}`, 'No text content found']);
            }
        }
        
        // If no text was extracted, add a default row
        if (textData.length === 1) {
            textData.push(['No Data', 'No text content could be extracted from this PDF']);
        }
        
        return textData;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return [['Error', 'Failed to extract text from PDF: ' + error.message]];
    }
}

async function downloadAsExcel() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    const excelBase64 = await getFromStorage(`excel_${currentSubtopicId}`);
    if (!excelBase64) {
        alert('No Excel data found. Please convert the PDF first.');
        return;
    }
    
    try {
        // Convert base64 back to binary
        const binaryString = atob(excelBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${document.getElementById('report-title').textContent.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading Excel file:', error);
        alert('Error downloading Excel file: ' + error.message);
    }
}

// Export to PDF
async function exportToPDF() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    const savedPDF = await getFromStorage(`pdf_${currentSubtopicId}`);
    if (!savedPDF) {
        alert('No PDF found for this report.');
        return;
    }
    
    try {
        // Convert base64 back to binary
        const binaryString = atob(savedPDF);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${document.getElementById('report-title').textContent.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Error exporting PDF: ' + error.message);
    }
}

// Print report
function printReport() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    if (pdfDoc) {
        window.print();
    } else {
        alert('No PDF loaded for printing.');
    }
}

// Set date range
async function setDateRange() {
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    const endDate = prompt('Enter end date (YYYY-MM-DD):');
    
    if (startDate && endDate) {
        alert(`Date range set: ${startDate} to ${endDate}`);
        // Store date range for current report
        if (currentSubtopicId) {
            await saveToStorage(`dateRange_${currentSubtopicId}`, JSON.stringify({ startDate, endDate }));
        }
    }
}

// Modal functions
function closeModal() {
    document.getElementById('topic-modal').style.display = 'none';
}

function closeSubtopicModal() {
    document.getElementById('subtopic-modal').style.display = 'none';
}

// Loading functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        closeModal();
        closeSubtopicModal();
        closeRenameModal();
        closeStorageModal();
        closeImportModal();
    }
    
    // Enter to submit forms in modals
    if (e.key === 'Enter') {
        if (document.getElementById('topic-modal').style.display === 'block') {
            createTopic();
        } else if (document.getElementById('subtopic-modal').style.display === 'block') {
            createSubtopic();
        } else if (document.getElementById('rename-modal').style.display === 'block') {
            confirmRename();
        } else if (document.getElementById('import-modal').style.display === 'block') {
            performImport();
        }
    }
    
    if (pdfDoc && document.getElementById('pdf-viewer').style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            prevPage();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            nextPage();
            e.preventDefault();
        } else if (e.key === '+' || e.key === '=') {
            zoomIn();
            e.preventDefault();
        } else if (e.key === '-') {
            zoomOut();
            e.preventDefault();
        }
    }
});

// Click outside modal to close
window.onclick = function(event) {
    const topicModal = document.getElementById('topic-modal');
    const subtopicModal = document.getElementById('subtopic-modal');
    const renameModal = document.getElementById('rename-modal');
    const storageModal = document.getElementById('storage-modal');
    const importModal = document.getElementById('import-modal');
    
    if (event.target === topicModal) {
        closeModal();
    }
    if (event.target === subtopicModal) {
        closeSubtopicModal();
    }
    if (event.target === renameModal) {
        closeRenameModal();
    }
    if (event.target === storageModal) {
        closeStorageModal();
    }
    if (event.target === importModal) {
        closeImportModal();
    }
};