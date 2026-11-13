-- New Christmas event type "nativity" (Nativity & drive-thru nativity, mostly churches). Moves the four nativity events already on the map into it.
UPDATE events SET type = 'nativity', updated_at = datetime('now')
 WHERE season = 'christmas' AND id IN ('g15-tapley-walkthrough-nativity', 'u-a-night-in-bethlehem-a-w-f4863f', 'u-drive-thru-nativity-at-m-d7f385', 'g19-night-in-bethlehem-to');
