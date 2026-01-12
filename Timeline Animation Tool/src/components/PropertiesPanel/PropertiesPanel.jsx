import React, { useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  Typography, 
  TextField, 
  Slider, 
  Divider,
  Paper
} from '@mui/material';
import { 
  useSelectedObject, 
  useSelectedObjectProperties,
  useSelectedObjectDetails,
  useCurrentTime,
  useKeyframes,
  useFabricCanvas
} from '../../store/hooks';
import { findFabricObjectById, extractPropertiesFromFabricObject } from '../../utils/fabricHelpers';

const PropertiesPanel = () => {
  const [selectedObject] = useSelectedObject();
  const [properties, setProperties] = useSelectedObjectProperties();
  const selectedDetails = useSelectedObjectDetails();
  const [currentTime] = useCurrentTime();
  const [keyframes] = useKeyframes();
  const [fabricCanvas] = useFabricCanvas();

  const drawerWidth = 300;

  // Update properties when time changes
  useEffect(() => {
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setProperties(props);
    }
  }, [currentTime, selectedObject, fabricCanvas, keyframes, setProperties]);

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Properties
        </Typography>
        
        {selectedObject && selectedDetails ? (
          <Box>
            <Paper 
              variant="outlined" 
              sx={{ p: 1.5, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}
            >
              <Typography variant="body2" fontWeight={600}>
                {selectedDetails.name}
              </Typography>
              <Typography variant="caption">
                {selectedDetails.type}
              </Typography>
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="X Position"
                type="number"
                value={Math.round(properties.x)}
                size="small"
                disabled
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <TextField
                label="Y Position"
                type="number"
                value={Math.round(properties.y)}
                size="small"
                disabled
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <TextField
                label="Scale X"
                type="number"
                value={properties.scaleX.toFixed(2)}
                size="small"
                disabled
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <TextField
                label="Scale Y"
                type="number"
                value={properties.scaleY.toFixed(2)}
                size="small"
                disabled
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <TextField
                label="Rotation"
                type="number"
                value={Math.round(properties.rotation)}
                size="small"
                disabled
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <Box>
                <Typography variant="body2" gutterBottom>
                  Opacity: {(properties.opacity * 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={properties.opacity}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                />
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Paper 
              variant="outlined" 
              sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                💡 <strong>Tip:</strong> Properties update as you scrub through time. 
                Modify the object on the stage, then click "Add Keyframe" to record its 
                state at the current time.
              </Typography>
            </Paper>
          </Box>
        ) : (
          <Paper 
            variant="outlined" 
            sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}
          >
            <Typography variant="body2" color="text.secondary">
              Select an object on the stage to view and edit its properties
            </Typography>
          </Paper>
        )}
      </Box>
    </Drawer>
  );
};

export default PropertiesPanel;