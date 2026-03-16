const axios = require('axios');
const { api } = require('../databases/index');
const fs = require('fs');
const FormData = require('form-data');
const JSZip = require('jszip');

function getApiKey() {
  return api.get('gpanel');
}

function getBase() {
  const base = api.get('gpanelBase');
  if (base) return base;
  if (process.env.GPANEL_API_BASE) return process.env.GPANEL_API_BASE;
  return 'http://localhost/api/v2';
}

function http() {
  const key = getApiKey();
  const headers = {};
  if (key) {
    headers.Authorization = `Bearer ${key}`;
    headers['X-API-Key'] = key;
  }
  headers['Accept'] = 'application/json';
  return axios.create({
    baseURL: getBase(),
    headers,
  });
}

async function usersMe() {
  const client = http();
  const res = await client.get('/users/me');
  return res.data;
}

async function appGet(appId) {
  const client = http();
  const res = await client.get(`/apps/${appId}`);
  return res.data;
}

async function appStatus(appId) {
  const client = http();
  const res = await client.get(`/apps/${appId}/status`);
  return res.data;
}

async function appLogs(appId) {
  const client = http();
  const res = await client.get(`/apps/${appId}/logs`);
  return res.data;
}

async function appStart(appId) {
  const client = http();
  const res = await client.post(`/apps/${appId}/start`);
  return res.data;
}

async function appStop(appId) {
  const client = http();
  const res = await client.post(`/apps/${appId}/stop`);
  return res.data;
}

async function appRestart(appId) {
  const client = http();
  const res = await client.post(`/apps/${appId}/restart`);
  return res.data;
}

async function appDelete(appId) {
  const client = http();
  const res = await client.delete(`/apps/${appId}`);
  return res.data;
}

async function appCommitZip(appId, zipBuffer) {
  const client = http();
  const form = new FormData();
  form.append('zip', zipBuffer, { filename: 'source.zip', contentType: 'application/zip' });
  const res = await client.post(`/apps/${appId}/commit`, form, { headers: form.getHeaders() });
  return res.data;
}

async function createZipFromFile(filePath, destName) {
  const zip = new JSZip();
  const buffer = fs.readFileSync(filePath);
  zip.file(destName, buffer);
  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function appCommitSingleFile(appId, filePath, destName) {
  const zipBuffer = await createZipFromFile(filePath, destName);
  return await appCommitZip(appId, zipBuffer);
}

async function appCreate(zipPath, name, options = {}) {
  const client = http();
  const form = new FormData();
  const buffer = fs.readFileSync(zipPath);
  form.append('zip', buffer, { filename: 'source.zip', contentType: 'application/zip' });
  if (name) form.append('name', name);
  const image = options.image || options.imagename || 'nodejs';
  if (image) form.append('image', image);
  if (image) form.append('imagename', image);
  form.append('memory', String(options.memory || 512));
  form.append('disk', String(options.disk || '1024'));
  form.append('cpu', String(options.cpu || 50));
  form.append('ports', options.ports || '3000:3000');
  form.append('primary', String(options.primary || 3000));
  form.append('nodeId', String(options.nodeId || '1'));
  if (options.variables) form.append('variables', JSON.stringify(options.variables));
  const res = await client.post('/apps', form, { headers: form.getHeaders() });
  return res.data;
}

module.exports = {
  usersMe,
  appGet,
  appStatus,
  appLogs,
  appStart,
  appStop,
  appRestart,
  appDelete,
  appCommitZip,
  appCommitSingleFile,
  appCreate,
};
