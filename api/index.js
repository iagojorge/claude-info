export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  return res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Backend API is running'
  });
}
