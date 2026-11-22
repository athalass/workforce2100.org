"""Where the build scripts find their inputs. Nothing machine-specific is written in the scripts themselves.

Set these environment variables once per machine (defaults are the Claude cloud workspace):
  W2100_DATA   the folder that mirrors Google Drive "Working papers/Data" (holds "Occupational analysis" and
               "AI Fluency Economics"). On Angelo's PC: G:/My Drive/Working papers/Data
  W2100_ONET   folder with the ONET31_*.csv files (default: W2100_DATA/Occupational analysis)
  W2100_IPEDS  folder with the unzipped IPEDS files: IPEDS_C2024_A/, IPEDS_C2023_A/, IPEDS_HD2024/
               (default: W2100_BUILD/dl)
  W2100_MODEL  folder with the national model scripts (model/occ_model.py ...) unzipped from
               Occupation_Outlook_scripts_v2.zip (default: /home/claude/build/oos/model)
  W2100_BUILD  scratch folder for intermediate files (default: /home/claude/build/skills)
The site root is found from this file's location (tools/..)."""
import os
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.environ.get('W2100_DATA', '/mnt/user-data/uploads')
OA = os.path.join(DATA, 'Occupational analysis')
AIFE = os.path.join(DATA, 'AI Fluency Economics', 'Derived')
BUILD = os.environ.get('W2100_BUILD', '/home/claude/build/skills')
ONET = os.environ.get('W2100_ONET', OA)
IPEDS = os.environ.get('W2100_IPEDS', os.path.join(BUILD, 'dl'))
MODEL = os.environ.get('W2100_MODEL', '/home/claude/build/oos/model')
def p(*a): return os.path.join(*a)
