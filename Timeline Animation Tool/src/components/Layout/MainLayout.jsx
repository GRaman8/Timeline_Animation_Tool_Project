// Phase-1&2 code:

// import React from 'react';
// import { Box } from '@mui/material';
// import Header from './Header';
// import Toolbar from '../Toolbar/Toolbar';
// import Canvas from '../Canvas/Canvas';
// import Timeline from '../Timeline/Timeline';
// import PropertiesPanel from '../PropertiesPanel/PropertiesPanel';

// const MainLayout = () => {
//   return (
//     <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
//       <Header />
      
//       <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
//         {/* Left Toolbar */}
//         <Toolbar />
        
//         {/* Main Content Area */}
//         <Box sx={{ 
//           flex: 1, 
//           display: 'flex', 
//           flexDirection: 'column', 
//           p: 2, 
//           overflow: 'auto',
//           bgcolor: '#f5f5f5'
//         }}>
//           <Canvas />
//           <Timeline />
//         </Box>
        
//         {/* Right Properties Panel */}
//         <PropertiesPanel />
//       </Box>
//     </Box>
//   );
// };

// export default MainLayout;

// Phase-3&4 code:

import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import Header from './Header';
import Toolbar from '../Toolbar/Toolbar';
import Canvas from '../Canvas/Canvas';
import Timeline from '../Timeline/Timeline';
import PropertiesPanel from '../PropertiesPanel/PropertiesPanel';
import LivePreview from '../CodeExport/LivePreview';

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Toolbar */}
        <Toolbar />
        
        {/* Main Content Area */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          bgcolor: '#f5f5f5'
        }}>
          {/* Tab Navigation */}
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2
          }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Editor" />
              <Tab label="Live Preview" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto',
            p: 2
          }}>
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Canvas />
                <Timeline />
              </Box>
            )}
            
            {activeTab === 1 && (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                <LivePreview />
              </Box>
            )}
          </Box>
        </Box>
        
        {/* Right Properties Panel */}
        <PropertiesPanel />
      </Box>
    </Box>
  );
};

export default MainLayout;