import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ContentCopy, 
  Download, 
  Close,
  Code,
} from '@mui/icons-material';
import { generateAnimationCode, downloadAllFiles, copyToClipboard } from '../../utils/codeGenerator';
import { useCanvasObjects, useKeyframes, useDuration, useLoopPlayback, useFabricCanvas, useCanvasBgColor } from '../../store/hooks';

const CodeExportDialog = ({ open, onClose }) => {
  const [canvasObjects] = useCanvasObjects();
  const [keyframes] = useKeyframes();
  const [duration] = useDuration();
  const [loopPlayback] = useLoopPlayback();
  const [fabricCanvas] = useFabricCanvas();
  const [canvasBgColor] = useCanvasBgColor();
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { html, css, javascript } = generateAnimationCode(
    canvasObjects, 
    keyframes, 
    duration, 
    loopPlayback,
    fabricCanvas,
    canvasBgColor
  );

  const handleCopy = async (content, label) => {
    const success = await copyToClipboard(content);
    if (success) {
      setSnackbarMessage(`${label} copied to clipboard!`);
      setSnackbarOpen(true);
    }
  };

  const handleDownloadAll = () => {
    downloadAllFiles(html, css, javascript);
    setSnackbarMessage('All files downloaded!');
    setSnackbarOpen(true);
  };

  const tabs = [
    { label: 'HTML', content: html, language: 'html' },
    { label: 'CSS', content: css, language: 'css' },
    { label: 'JavaScript', content: javascript, language: 'javascript' },
  ];

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Code />
              <Typography variant="h6">Export Animation Code</Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
              {tabs.map((tab, index) => (
                <Tab key={index} label={tab.label} />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ position: 'relative' }}>
            <Box sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8, 
              zIndex: 1 
            }}>
              <IconButton
                size="small"
                onClick={() => handleCopy(tabs[currentTab].content, tabs[currentTab].label)}
                sx={{ bgcolor: 'background.paper' }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Box>

            <Box
              component="pre"
              sx={{
                bgcolor: '#1e1e1e',
                color: '#d4d4d4',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 500,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              <code>{tabs[currentTab].content}</code>
            </Box>
          </Box>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" color="info.contrastText">
              <strong>💡 Usage Instructions:</strong>
              <br />
              1. Download all files or copy each code block
              <br />
              2. Create three files: index.html, style.css, and animation.js
              <br />
              3. Place all files in the same folder
              <br />
              4. Open index.html in a web browser to view your animation
              <br />
              5. The animation uses GSAP (loaded from CDN) - no installation required!
              <br />
              {loopPlayback && (
                <>
                  <br />
                  <strong>🔁 Loop is ENABLED</strong> - Animation will repeat infinitely
                </>
              )}
              {!loopPlayback && (
                <>
                  <br />
                  <strong>▶️ Loop is DISABLED</strong> - Animation will play once and stop
                </>
              )}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Close
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Download />}
            onClick={handleDownloadAll}
          >
            Download All Files
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CodeExportDialog;