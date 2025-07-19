import React, {useState} from 'react';
import styles from './GraphPage.module.css';

interface AddNoteMenuProps {
    onClose: () => void;
    node: string[],
    onAddnode: (newNode: string) => void;
}


export const AddNoteMenu: React.FC<AddNoteMenuProps> = ({ onClose, node, onAddnode }) => {
    return (
        <div className = {styles.nodeModalOverlay} onClick = {onClose}>

        </div>
    )
}