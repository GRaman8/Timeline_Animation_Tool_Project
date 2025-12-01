// Phase-1&2 code:

// import React from 'react';
// import { Box, Typography, Paper } from '@mui/material';
// import { useSelectedObject, useDuration } from '../../store/hooks';

// const TimelineTrack = ({ object, keyframes }) => {
//   const [selectedObject] = useSelectedObject();
//   const [duration] = useDuration();
//   const isSelected = selectedObject === object.id;

//   return (
//     <Paper 
//       variant="outlined" 
//       sx={{ 
//         p: 1, 
//         mb: 1,
//         bgcolor: isSelected ? 'action.selected' : 'background.paper',
//         transition: 'background-color 0.2s',
//       }}
//     >
//       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//         <Typography 
//           variant="body2" 
//           sx={{ minWidth: 100, fontWeight: isSelected ? 600 : 400 }}
//         >
//           {object.name}
//         </Typography>
        
//         <Box sx={{ 
//           flex: 1, 
//           position: 'relative', 
//           height: 30, 
//           bgcolor: '#f5f5f5', 
//           borderRadius: 1,
//           border: '1px solid #e0e0e0'
//         }}>
//           {keyframes.map((kf, idx) => (
//             <Box
//               key={idx}
//               sx={{
//                 position: 'absolute',
//                 left: `${(kf.time / duration) * 100}%`,
//                 top: '50%',
//                 transform: 'translate(-50%, -50%)',
//                 width: 8,
//                 height: 8,
//                 bgcolor: 'primary.main',
//                 borderRadius: '50%',
//                 border: '2px solid white',
//                 cursor: 'pointer',
//                 transition: 'all 0.2s',
//                 '&:hover': {
//                   width: 12,
//                   height: 12,
//                   bgcolor: 'primary.dark',
//                 }
//               }}
//             />
//           ))}
//         </Box>
        
//         <Typography 
//           variant="caption" 
//           sx={{ minWidth: 80, textAlign: 'right', color: 'text.secondary' }}
//         >
//           {keyframes.length} keyframe{keyframes.length !== 1 ? 's' : ''}
//         </Typography>
//       </Box>
//     </Paper>
//   );
// };

// export default TimelineTrack;

// Phase-3 code:

import React from 'react';
import { Box, Typography, Paper, IconButton, Menu, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Delete, MoreVert } from '@mui/icons-material';
import { useSelectedObject, useDuration, useKeyframes, useCurrentTime } from '../../store/hooks';
import { EASING_OPTIONS } from '../../utils/easing';

const TimelineTrack = ({ object, keyframes: objectKeyframes }) => {
  const [selectedObject, setSelectedObject] = useSelectedObject();
  const [duration] = useDuration();
  const [keyframes, setKeyframes] = useKeyframes();
  const [currentTime, setCurrentTime] = useCurrentTime();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedKfIndex, setSelectedKfIndex] = React.useState(null);
  
  const isSelected = selectedObject === object.id;

  const handleKeyframeClick = (index, event) => {
    event.stopPropagation();
    setSelectedObject(object.id);
    setCurrentTime(objectKeyframes[index].time);
  };

  const handleKeyframeRightClick = (index, event) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedKfIndex(index);
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedKfIndex(null);
  };

  const handleDeleteKeyframe = () => {
    if (selectedKfIndex === null) return;

    setKeyframes(prev => {
      const updated = { ...prev };
      updated[object.id] = updated[object.id].filter((_, idx) => idx !== selectedKfIndex);
      return updated;
    });
    handleCloseMenu();
  };

  const handleChangeEasing = (easingType) => {
    if (selectedKfIndex === null) return;

    setKeyframes(prev => {
      const updated = { ...prev };
      updated[object.id] = [...updated[object.id]];
      updated[object.id][selectedKfIndex] = {
        ...updated[object.id][selectedKfIndex],
        easing: easingType
      };
      return updated;
    });
    handleCloseMenu();
  };

  const handleTrackClick = () => {
    setSelectedObject(object.id);
  };

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 1, 
        mb: 1,
        bgcolor: isSelected ? 'action.selected' : 'background.paper',
        transition: 'background-color 0.2s',
        cursor: 'pointer'
      }}
      onClick={handleTrackClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ minWidth: 100, fontWeight: isSelected ? 600 : 400 }}
        >
          {object.name}
        </Typography>
        
        <Box sx={{ 
          flex: 1, 
          position: 'relative', 
          height: 30, 
          bgcolor: '#f5f5f5', 
          borderRadius: 1,
          border: '1px solid #e0e0e0'
        }}>
          {objectKeyframes.map((kf, idx) => (
            <Box
              key={idx}
              onClick={(e) => handleKeyframeClick(idx, e)}
              onContextMenu={(e) => handleKeyframeRightClick(idx, e)}
              sx={{
                position: 'absolute',
                left: `${(kf.time / duration) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 10,
                height: 10,
                bgcolor: kf.easing !== 'linear' ? 'secondary.main' : 'primary.main',
                borderRadius: '50%',
                border: '2px solid white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  width: 14,
                  height: 14,
                  bgcolor: 'primary.dark',
                },
                zIndex: Math.abs(currentTime - kf.time) < 0.1 ? 10 : 1,
                boxShadow: Math.abs(currentTime - kf.time) < 0.1 ? '0 0 0 2px yellow' : 'none',
              }}
            />
          ))}
        </Box>
        
        <Typography 
          variant="caption" 
          sx={{ minWidth: 80, textAlign: 'right', color: 'text.secondary' }}
        >
          {objectKeyframes.length} keyframe{objectKeyframes.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Keyframe Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem disabled>
          <Typography variant="caption" color="text.secondary">
            Keyframe at {selectedKfIndex !== null ? objectKeyframes[selectedKfIndex]?.time.toFixed(2) : 0}s
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleDeleteKeyframe}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Keyframe
        </MenuItem>
        {EASING_OPTIONS.map(option => (
          <MenuItem 
            key={option.value}
            onClick={() => handleChangeEasing(option.value)}
            selected={selectedKfIndex !== null && objectKeyframes[selectedKfIndex]?.easing === option.value}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
};

export default TimelineTrack;