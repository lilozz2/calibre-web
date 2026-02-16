import os
import glob
from flask_babel import lazy_gettext as N_
from cps.services.worker import CalibreTask
from cps import logger, config, db
from cps.tts_core import convert_epub_tts
from pathlib import Path

STAT_ENDED = 4

log = logger.create()

class TaskTTS(CalibreTask):
    def __init__(self, book_id, book_format, book_file, voice, speed, selected_chapters, user_id, user_name):
        super(TaskTTS, self).__init__(N_("Converting book to audiobook"))
        self.book_id = book_id
        self.book_format = book_format
        self.book_file = book_file
        self.voice = voice
        self.speed = speed
        self.selected_chapters = selected_chapters
        self.user_name = user_name
        self.user_id = user_id
        self.results = {}

    def run(self, worker_thread):
        """Main TTS conversion logic"""
        try:
            from cps import calibre_db, app
            from cps.cw_login import login_user

            with app.app_context():
                cancel_check = lambda: self.stat == STAT_ENDED
                print(self._stat)
                if cancel_check():
                    raise InterruptedError("TTS conversion was cancelled")

                book = calibre_db.get_book(self.book_id)
                if not book:
                    self._handleError(N_("Book not found"))
                    return

                self.message = N_("Preparing TTS conversion")
                self.progress = 0.1

                tts_dir = os.path.join(config.config_calibre_dir, book.path)

                self.message = N_("Converting text to speech")
                self.progress = 0.2

                # Perform TTS conversion with progress callback
                espeak_path = "/opt/homebrew/opt/espeak-ng/share/espeak-ng-data"

                try:
                    convert_epub_tts(
                        self.book_file,
                        self.voice,
                        self.speed,
                        self.selected_chapters,
                        espeak_path,
                        tts_dir,
                        post_event=self._progress_callback,
                        cancel_check=cancel_check
                    )

                    # Find the generated audiobook
                    audiobook_list = glob.glob(os.path.join(tts_dir, '*.m4b'))
                    if audiobook_list:
                        output_file = audiobook_list[0]

                        # Clean up temporary WAV files
                        for wav_file in glob.glob(os.path.join(tts_dir, '*.wav')):
                            os.remove(wav_file)
                        self.results['output_file'] = output_file

                        file_name = Path(self.book_file).stem
                        file_size = os.path.getsize(output_file)
                        file_ext = output_file.rsplit('.', 1)[-1].lower()

                        try:
                            existing_format = calibre_db.get_book_format(self.book_id, file_ext.upper())
                            if existing_format:
                                calibre_db.session.delete(existing_format)
                                calibre_db.session.commit()
                            db_format = db.Data(self.book_id, file_ext.upper(), file_size, file_name)
                            calibre_db.session.add(db_format)
                            calibre_db.session.commit()
                            calibre_db.create_functions(config)
                        except Exception as e:
                            calibre_db.session.rollback()
                            self._handleError(N_("Audiobook database update failed: %(error)s", error=str(e)))

                        self.progress = 1.0
                        self.message = N_("TTS conversion completed successfully")
                        self._handleSuccess()
                    else:
                        self._handleError(N_("No audiobook file was generated"))
                except Exception as e:
                    log.error("TTS conversion failed: %s", str(e))
                    self._handleError(N_("TTS conversion failed: %(error)s", error=str(e)))

        except InterruptedError:
            self._handleError(N_("TTS conversion was cancelled"))
            return

        except Exception as e:
            log.error("TTS task failed: %s", str(e))
            self._handleError(N_("TTS task failed: %(error)s", error=str(e)))

    def _progress_callback(self, event_type, **kwargs):
        if event_type == 'CORE_CHAPTER_FINISHED':
            chapter_index = kwargs.get('chapter_index', 0)
            total_chapters = len(self.selected_chapters)
            if total_chapters > 0:
                chapter_progress = (chapter_index / total_chapters) * 0.7
                self.progress = 0.2 + chapter_progress

        elif event_type == 'CORE_PROGRESS':
            stats = kwargs.get('stats')
            if stats:
                # Fine-grained progress within current chapter
                base_progress = self.progress
                self.message = N_("Processing: %(progress)d%% complete. ETA: %(eta)s",
                               progress=stats.progress, eta=stats.eta)

        elif event_type == 'CORE_FINISHED':
            self.progress = 0.9
            self.message = N_("Finalizing audiobook")
    
    @property
    def name(self):
        return N_("TTS Conversion")

    def __str__(self):
        return f"TTS conversion for book {self.book_id} ({self.book_format})"

    @property
    def is_cancellable(self):
        return True