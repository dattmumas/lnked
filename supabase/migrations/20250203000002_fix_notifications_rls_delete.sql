-- Add DELETE policy for notifications table
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (recipient_id = auth.uid()); 