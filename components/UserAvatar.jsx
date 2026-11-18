import React from 'react';
import {View} from 'react-native';
import { AVATARS,DEFAULT_AVATAR_ID } from '../assets/avatars';

export const UserAvatar = ({id,size = 48, className}) => {
    const SelectedAvatar = AVATARS[id] || AVATARS[DEFAULT_AVATAR_ID];

    return (
        <View style={{width:size,height:size}} className={className}>
            <SelectedAvatar width="100%" height="100%"></SelectedAvatar>
        </View>
    );
};