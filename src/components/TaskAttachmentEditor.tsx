import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Attachment } from '../types';
import { useAppTheme } from '../theme/useAppTheme';

type Props = {
  attachments: Attachment[];
  onChange: React.Dispatch<React.SetStateAction<Attachment[]>>;
};

export function TaskAttachmentEditor({ attachments, onChange }: Props) {
  const theme = useAppTheme();

  async function addImages() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.canceled) return;

      const createdAt = new Date().toISOString();
      onChange(current => [
        ...current,
        ...result.assets.map((asset, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}-${index + 1}.jpg`,
          mimeType: asset.mimeType,
          size: asset.fileSize,
          createdAt,
        })),
      ]);
    } catch (error) {
      Alert.alert(
        'Unable to add images',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  }

  return (
    <>
      <Text style={[styles.label, { color: theme.text }]}>Attachments (optional)</Text>
      <Text style={[styles.hint, { color: theme.muted }]}>
        Add photos before creating the task.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add task images"
        style={[styles.addImages, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={addImages}
      >
        <Text style={{ color: theme.text }}>Add images</Text>
      </Pressable>
      {attachments.length > 0 && (
        <View style={styles.attachmentList}>
          {attachments.map(attachment => (
            <View
              key={attachment.id}
              style={[styles.attachment, { backgroundColor: theme.surface }]}
            >
              <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
              <Text style={[styles.attachmentName, { color: theme.text }]} numberOfLines={1}>
                {attachment.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${attachment.name}`}
                onPress={() =>
                  onChange(current => current.filter(item => item.id !== attachment.id))
                }
              >
                <Text style={styles.removeAttachment}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700', marginBottom: 6, marginTop: 10 },
  hint: { fontSize: 13, marginBottom: 8 },
  addImages: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  attachmentList: { gap: 8, marginTop: 10 },
  attachment: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 8, gap: 9 },
  attachmentImage: { width: 44, height: 44, borderRadius: 7 },
  attachmentName: { flex: 1, fontSize: 13 },
  removeAttachment: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
});
