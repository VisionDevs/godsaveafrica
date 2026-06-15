/**
 * GSAW Google Apps Script - Updated with POP file storage in Google Drive
 * 
 * DEPLOY INSTRUCTIONS:
 * 1. Go to https://script.google.com and open your GSAW project
 * 2. Replace ALL the code with this file's contents
 * 3. Click Deploy > Manage Deployments > Edit (pencil icon)
 * 4. Change version to "New version"
 * 5. Click Deploy
 * 
 * IMPORTANT: Create a folder in your Google Drive called "GSAW_POP_Files" 
 * (or it will be auto-created on first upload)
 */

var SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
var MEMBERSHIPS_TAB = 'Memberships';
var DONATIONS_TAB = 'Donations';
var POP_FOLDER_NAME = 'GSAW_POP_Files';

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'getApplications') {
    return getApplications();
  } else if (action === 'getDonations') {
    return getDonations();
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.parameter.payload || e.postData.contents;
    var data = JSON.parse(raw);
    var action = data.action;
    var payload = data.payload;
    
    if (action === 'addMembership') {
      return addMembership(payload);
    } else if (action === 'addDonation') {
      return addDonation(payload);
    } else if (action === 'updateMembership') {
      return updateMembership(payload);
    } else if (action === 'updateDonation') {
      return updateDonation(payload);
    } else if (action === 'deleteMembership') {
      return deleteMembership(payload);
    } else if (action === 'deleteDonation') {
      return deleteDonation(payload);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// GET APPLICATIONS
// ========================================
function getApplications() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(MEMBERSHIPS_TAB);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0];
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    results.push(row);
  }
  
  return ContentService.createTextOutput(JSON.stringify(results))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// GET DONATIONS
// ========================================
function getDonations() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(DONATIONS_TAB);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0];
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    results.push(row);
  }
  
  return ContentService.createTextOutput(JSON.stringify(results))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// ADD MEMBERSHIP
// ========================================
function addMembership(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(MEMBERSHIPS_TAB);
  
  if (!sheet) {
    sheet = ss.insertSheet(MEMBERSHIPS_TAB);
    var headers = ['firstName', 'lastName', 'fullName', 'idNumber', 'dateOfBirth', 'gender', 'email', 'phone', 'address', 'city', 'province', 'postalCode', 'membershipNumber', 'status', 'submittedAt', 'approvedAt'];
    sheet.appendRow(headers);
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    row.push(payload[headers[i]] || '');
  }
  
  // Add any new fields not in headers
  var existingHeaders = new Set(headers);
  for (var key in payload) {
    if (!existingHeaders.has(key) && key !== 'signatureData') {
      headers.push(key);
      row.push(payload[key] || '');
    }
  }
  
  if (headers.length > sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  sheet.appendRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// ADD DONATION (with Google Drive POP storage)
// ========================================
function addDonation(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(DONATIONS_TAB);
  
  if (!sheet) {
    sheet = ss.insertSheet(DONATIONS_TAB);
    var headers = ['donorName', 'donorType', 'firstName', 'lastName', 'orgName', 'contactPerson', 'amount', 'purpose', 'email', 'phone', 'message', 'hasProofOfPayment', 'proofFileName', 'proofFileType', 'proofFileUrl', 'status', 'submittedAt', 'verifiedAt'];
    sheet.appendRow(headers);
  }
  
  // If there's base64 file data, save to Google Drive
  var proofFileUrl = '';
  if (payload.proofFileData) {
    try {
      proofFileUrl = saveFileToDrive(payload.proofFileData, payload.proofFileName || 'POP_file', payload.donorName || 'Donor');
    } catch (err) {
      // If file save fails, continue without it
      Logger.log('File save error: ' + err.message);
    }
  }
  
  // Remove base64 data from what goes into the sheet (too large for cells)
  var sheetPayload = {};
  for (var key in payload) {
    if (key !== 'proofFileData') {
      sheetPayload[key] = payload[key];
    }
  }
  sheetPayload.proofFileUrl = proofFileUrl;
  if (!sheetPayload.status) sheetPayload.status = 'pending';
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    row.push(sheetPayload[headers[i]] || '');
  }
  
  // Add any new fields not in headers
  var existingHeaders = new Set(headers);
  for (var key in sheetPayload) {
    if (!existingHeaders.has(key)) {
      headers.push(key);
      row.push(sheetPayload[key] || '');
    }
  }
  
  if (headers.length > sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  sheet.appendRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, proofFileUrl: proofFileUrl }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// SAVE FILE TO GOOGLE DRIVE
// ========================================
function saveFileToDrive(base64Data, fileName, donorName) {
  // Get or create the POP folder
  var folders = DriveApp.getFoldersByName(POP_FOLDER_NAME);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(POP_FOLDER_NAME);
  }
  
  // Parse base64 data URI
  // Format: data:image/png;base64,iVBOR...  or  data:application/pdf;base64,JVBERi...
  var parts = base64Data.split(',');
  var mimeMatch = parts[0].match(/data:(.*?);/);
  var mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  var base64Content = parts[1];
  
  // Decode base64 to blob
  var decoded = Utilities.base64Decode(base64Content);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  
  // Create file in Drive with donor name prefix for organization
  var timestamp = Utilities.formatDate(new Date(), 'Africa/Johannesburg', 'yyyyMMdd_HHmmss');
  var safeName = donorName.replace(/[^a-zA-Z0-9]/g, '_');
  var driveFileName = 'POP_' + safeName + '_' + timestamp + '_' + fileName;
  
  var file = folder.createFile(blob.setName(driveFileName));
  
  // Make file viewable by anyone with the link
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Return the preview URL (works in iframe)
  var fileId = file.getId();
  return 'https://drive.google.com/file/d/' + fileId + '/preview';
}

// ========================================
// UPDATE MEMBERSHIP
// ========================================
function updateMembership(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(MEMBERSHIPS_TAB);
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('email');
  var idCol = headers.indexOf('idNumber');
  
  for (var i = 1; i < data.length; i++) {
    var match = false;
    if (payload.email && emailCol >= 0 && data[i][emailCol] === payload.email) match = true;
    if (payload.idNumber && idCol >= 0 && data[i][idCol] === payload.idNumber) match = true;
    
    if (match) {
      for (var key in payload) {
        var col = headers.indexOf(key);
        if (col >= 0) {
          sheet.getRange(i + 1, col + 1).setValue(payload[key]);
        }
      }
      break;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// UPDATE DONATION
// ========================================
function updateDonation(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(DONATIONS_TAB);
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('email');
  var dateCol = headers.indexOf('submittedAt');
  
  for (var i = 1; i < data.length; i++) {
    var matchEmail = payload.email && emailCol >= 0 && data[i][emailCol] === payload.email;
    var matchDate = payload.submittedAt && dateCol >= 0 && data[i][dateCol] === payload.submittedAt;
    
    if (matchEmail && matchDate) {
      for (var key in payload) {
        var col = headers.indexOf(key);
        if (col >= 0) {
          sheet.getRange(i + 1, col + 1).setValue(payload[key]);
        }
      }
      break;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// DELETE MEMBERSHIP
// ========================================
function deleteMembership(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(MEMBERSHIPS_TAB);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('email');
  var idCol = headers.indexOf('idNumber');
  
  for (var i = data.length - 1; i >= 1; i--) {
    var match = false;
    if (payload.email && emailCol >= 0 && String(data[i][emailCol]) === String(payload.email)) match = true;
    if (payload.idNumber && idCol >= 0 && String(data[i][idCol]) === String(payload.idNumber)) match = true;
    
    if (match) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// DELETE DONATION
// ========================================
function deleteDonation(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(DONATIONS_TAB);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('email');
  var dateCol = headers.indexOf('submittedAt');
  
  for (var i = data.length - 1; i >= 1; i--) {
    var matchEmail = payload.email && emailCol >= 0 && String(data[i][emailCol]) === String(payload.email);
    var matchDate = payload.submittedAt && dateCol >= 0 && String(data[i][dateCol]) === String(payload.submittedAt);
    
    if (matchEmail && matchDate) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}
