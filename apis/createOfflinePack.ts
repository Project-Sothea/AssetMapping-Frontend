import { offlineManager } from '@rnmapbox/maps';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type CreateOfflinePackProps = Parameters<typeof offlineManager.createPack>[0];

export const CreateOfflinePack = async (options: CreateOfflinePackProps) => {
  try {
    await offlineManager.createPack(options, (pack, status) => {
      console.log('pack: ', pack);
      console.log('status: ', status);
    });
  } catch (err) {
    console.error('Offline pack error:', err);
  }
};

/*
Errors:
1.  ERROR  [Error: Offline pack with name Sre O Primary School already exists.]
*/
