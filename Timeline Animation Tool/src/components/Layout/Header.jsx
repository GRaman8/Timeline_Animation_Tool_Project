// Phase-1& 2 code:

// import React from 'react';
// import { AppBar, Toolbar, Typography, Box } from '@mui/material';

// const Header = () => {
//   return (
//     <AppBar position="static">
//       <Toolbar>
//         <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
//           Timeline Animation Tool
//         </Typography>
//         <Typography variant="caption" sx={{ mr: 2 }}>
//           Canvas Editor + Timeline System
//         </Typography>
//       </Toolbar>
//     </AppBar>
//   );
// };

// export default Header;

// Phase-3 & 4 code:

import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { Code } from '@mui/icons-material';
import CodeExportDialog from '../CodeExport/CodeExportDialog';

const Header = () => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Timeline Animation Tool
          </Typography>
          <Typography variant="caption" sx={{ mr: 2 }}>
            Full Featured Animation Editor
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<Code />}
            onClick={() => setExportDialogOpen(true)}
            variant="outlined"
            sx={{ borderColor: 'white' }}
          >
            Export Code
          </Button>
        </Toolbar>
      </AppBar>

      <CodeExportDialog 
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
    </>
  );
};

export default Header;