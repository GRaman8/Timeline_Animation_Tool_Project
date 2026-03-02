import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Typography, Paper, IconButton, Menu, MenuItem, TextField, Tooltip 
} from '@mui/material';
import { 
  Delete, Lock, LockOpen, DragIndicator 
} from '@mui/icons-material';
import { 
  useSelectedObject, 
  useDuration, 
  useKeyframes, 
  useCurrentTime, 
  useSelectedKeyframe,
  useLockedTracks,
  useCanvasObjects,
  useFabricCanvas,
} from '../../store/hooks';
import { EASING_OPTIONS } from '../../utils/easing';
import { findFabricObjectById } from '../../utils/fabricHelpers';

const TimelineTrack = ({ 
  object, 
  keyframes: objectKeyframes,
  isDragged,
  isDragOver,
  dragOverPosition,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  trackIndex,
}) => {
  const [selectedObject, setSelectedObject] = useSelectedObject();
  const [duration] = useDuration();
  const [keyframes, setKeyframes] = useKeyframes();
  const [currentTime, setCurrentTime] = useCurrentTime();
  const [selectedKeyframe, setSelectedKeyframe] = useSelectedKeyframe();
  const [lockedTracks, setLockedTracks] = useLockedTracks();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  const [fabricCanvas] = useFabricCanvas();
  
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [contextKfIndex, setContextKfIndex] = React.useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(object?.name || '');
  const renameInputRef = useRef(null);

  // Defensive guard — if object is undefined (race condition during add/remove), skip render
  if (!object) return null;
  
  const isSelected = selectedObject === object.id;
  // FIX: Use plain object lookup, not Set.has()
  const isLocked = !!lockedTracks[object.id];

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const isKeyframeSelected = (idx) => {
    return selectedKeyframe && 
           selectedKeyframe.objectId === object.id && 
           selectedKeyframe.index === idx;
  };

  // ===== KEYFRAME CLICK =====
  const handleKeyframeClick = (index, event) => {
    event.stopPropagation();
    if (isLocked) return;
    
    const kf = objectKeyframes[index];
    
    setSelectedObject(object.id);
    setCurrentTime(kf.time);
    setSelectedKeyframe({ objectId: object.id, index });
    
    // Apply keyframe properties to fabric object for visual feedback
    if (fabricCanvas) {
      const fabricObject = findFabricObjectById(fabricCanvas, object.id);
      if (fabricObject && kf.properties) {
        fabricObject.set({
          left: kf.properties.x,
          top: kf.properties.y,
          scaleX: kf.properties.scaleX,
          scaleY: kf.properties.scaleY,
          angle: kf.properties.rotation,
          opacity: kf.properties.opacity,
        });
        fabricObject.setCoords();
        fabricCanvas.setActiveObject(fabricObject);
        fabricCanvas.renderAll();
      }
    }
  };

  // ===== CONTEXT MENU =====
  const handleKeyframeRightClick = (index, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLocked) return;
    setContextKfIndex(index);
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setContextKfIndex(null);
  };

  const handleDeleteKeyframe = () => {
    if (contextKfIndex === null) return;
    setKeyframes(prev => {
      const updated = { ...prev };
      updated[object.id] = updated[object.id].filter((_, idx) => idx !== contextKfIndex);
      return updated;
    });
    if (selectedKeyframe?.objectId === object.id && selectedKeyframe?.index === contextKfIndex) {
      setSelectedKeyframe(null);
    }
    handleCloseMenu();
  };

  const handleChangeEasing = (easingType) => {
    if (contextKfIndex === null) return;
    setKeyframes(prev => {
      const updated = { ...prev };
      updated[object.id] = [...updated[object.id]];
      updated[object.id][contextKfIndex] = {
        ...updated[object.id][contextKfIndex],
        easing: easingType
      };
      return updated;
    });
    handleCloseMenu();
  };

  // ===== TRACK CLICK =====
  const handleTrackClick = () => {
    if (isLocked) return;
    setSelectedObject(object.id);
    setSelectedKeyframe(null);
  };

  // ===== LOCK TOGGLE =====
  // FIX: Use plain object spread, not Set mutation
  const handleToggleLock = (e) => {
    e.stopPropagation();
    setLockedTracks(prev => {
      const next = { ...prev };
      if (next[object.id]) {
        delete next[object.id];
      } else {
        next[object.id] = true;
      }
      return next;
    });
  };

  // ===== RENAME =====
  const handleDoubleClickName = (e) => {
    e.stopPropagation();
    if (isLocked) return;
    setRenameValue(object.name);
    setIsRenaming(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== object.name) {
      setCanvasObjects(prev => prev.map(obj =>
        obj.id === object.id ? { ...obj, name: trimmed } : obj
      ));
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  // ===== DRAG INDICATOR STYLE =====
  const getDragIndicatorStyle = () => {
    if (!isDragOver) return {};
    if (dragOverPosition === 'above') {
      return { borderTop: '3px solid #1976d2' };
    } else {
      return { borderBottom: '3px solid #1976d2' };
    }
  };

  // ===== TYPE ICON =====
  const getTypeIcon = () => {
    switch (object.type) {
      case 'rectangle': return '▬';
      case 'circle': return '●';
      case 'text': return 'T';
      case 'path': return '✎';
      case 'group': return '⊞';
      case 'fill': return '🪣';
      default: return '•';
    }
  };

  return (
    <Paper 
      variant="outlined" 
      draggable={!isLocked}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', object.id);
        onDragStart?.();
      }}
      onDragOver={(e) => onDragOver?.(e)}
      onDrop={(e) => onDrop?.(e)}
      onDragEnd={onDragEnd}
      sx={{ 
        p: 0.75, 
        mb: 0.5,
        bgcolor: isLocked 
          ? 'grey.200' 
          : isSelected 
            ? 'action.selected' 
            : 'background.paper',
        opacity: isLocked ? 0.5 : isDragged ? 0.4 : 1,
        transition: 'all 0.2s',
        cursor: isLocked ? 'default' : 'pointer',
        userSelect: 'none',
        ...getDragIndicatorStyle(),
      }}
      onClick={handleTrackClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Drag Handle */}
        <Tooltip title="Drag to reorder">
          <Box 
            sx={{ 
              cursor: isLocked ? 'default' : 'grab', 
              display: 'flex', 
              alignItems: 'center',
              color: 'text.disabled',
              '&:hover': { color: isLocked ? 'text.disabled' : 'text.primary' },
            }}
          >
            <DragIndicator fontSize="small" />
          </Box>
        </Tooltip>

        {/* Lock Toggle */}
        <Tooltip title={isLocked ? "Unlock track" : "Lock track (disable editing)"}>
          <IconButton size="small" onClick={handleToggleLock} sx={{ p: 0.25 }}>
            {isLocked 
              ? <Lock fontSize="small" color="disabled" /> 
              : <LockOpen fontSize="small" color="action" />
            }
          </IconButton>
        </Tooltip>

        {/* Type Icon + Name */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5, 
          minWidth: 110, 
          maxWidth: 130 
        }}>
          <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.6 }}>
            {getTypeIcon()}
          </Typography>
          
          {isRenaming ? (
            <TextField
              inputRef={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              size="small"
              variant="standard"
              sx={{ 
                '& input': { 
                  fontSize: '0.75rem', 
                  p: 0, 
                  fontWeight: 600 
                },
                maxWidth: 100,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Tooltip title="Double-click to rename">
              <Typography 
                variant="body2" 
                onDoubleClick={handleDoubleClickName}
                sx={{ 
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: isLocked ? 'default' : 'text',
                }}
              >
                {object.name}
              </Typography>
            </Tooltip>
          )}
        </Box>
        
        {/* Keyframe Track Bar */}
        <Box sx={{ 
          flex: 1, 
          position: 'relative', 
          height: 28, 
          bgcolor: isLocked ? '#e8e8e8' : '#f5f5f5', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: isSelected ? 'primary.main' : '#e0e0e0',
        }}>
          {objectKeyframes.map((kf, idx) => {
            const isKfSelected = isKeyframeSelected(idx);
            const isAtScrubber = Math.abs(currentTime - kf.time) < 0.05;
            const hasEasing = kf.easing && kf.easing !== 'linear';
            
            let kfColor = 'primary.main';
            if (isKfSelected) {
              kfColor = '#ff9800';
            } else if (isAtScrubber) {
              kfColor = '#4caf50';
            } else if (hasEasing) {
              kfColor = 'secondary.main';
            }

            return (
              <Tooltip 
                key={idx} 
                title={`${kf.time.toFixed(2)}s${hasEasing ? ` (${kf.easing})` : ''}`}
                placement="top"
              >
                <Box
                  onClick={(e) => handleKeyframeClick(idx, e)}
                  onContextMenu={(e) => handleKeyframeRightClick(idx, e)}
                  sx={{
                    position: 'absolute',
                    left: `${(kf.time / duration) * 100}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                    width: isKfSelected ? 12 : 9,
                    height: isKfSelected ? 12 : 9,
                    bgcolor: kfColor,
                    border: isKfSelected 
                      ? '2px solid #e65100' 
                      : '2px solid white',
                    borderRadius: isKfSelected ? '2px' : '1px',
                    cursor: isLocked ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isKfSelected 
                      ? '0 0 0 3px rgba(255,152,0,0.4)' 
                      : isAtScrubber 
                        ? '0 0 0 2px rgba(76,175,80,0.4)' 
                        : 'none',
                    '&:hover': isLocked ? {} : {
                      width: 13,
                      height: 13,
                      bgcolor: isKfSelected ? '#e65100' : 'primary.dark',
                    },
                    zIndex: isKfSelected ? 10 : isAtScrubber ? 5 : 1,
                    pointerEvents: isLocked ? 'none' : 'auto',
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>
        
        {/* Keyframe count */}
        <Typography 
          variant="caption" 
          sx={{ 
            minWidth: 50, 
            textAlign: 'right', 
            color: 'text.secondary',
            fontSize: '0.7rem',
          }}
        >
          {objectKeyframes.length} kf
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
            Keyframe at {contextKfIndex !== null ? objectKeyframes[contextKfIndex]?.time.toFixed(2) : 0}s
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
            selected={contextKfIndex !== null && objectKeyframes[contextKfIndex]?.easing === option.value}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
};

export default TimelineTrack;