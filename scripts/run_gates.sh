#!/bin/bash
# v0.0.30 gate runner (adds senses, dsp_bench, oldfeat, muffle_live) (worktree R): headless node tests in parallel, browser ones serially. Prints one line per gate.
export PATH=/home/box/node22/bin:$PATH; cd ${R:-/workspace/r2_muffle}; L=${1:-/workspace/gates_last}; mkdir -p $L
run(){ t=$1; timeout 1200 node tests/$t > $L/$t.log 2>&1; rc=$?; f=$(grep -cE '^FAIL' $L/$t.log); echo "$t rc=$rc fails=$f | $(grep -E '^FAIL' $L/$t.log | cut -c1-110 | tr '\n' ';') $(tail -1 $L/$t.log | cut -c1-150)"; }
export -f run; export L
printf "%s\n" rare_test.mjs traditions_test.mjs dive_test.mjs gesture_test.mjs look_test.mjs look_aura_test.mjs systems_test.mjs place_trad_test.mjs haptics_test.mjs drawn_p_test.mjs answers_test.mjs step5_test.mjs autojam_test.mjs abilities_test.mjs gasfloat_test.mjs senses_test.mjs oldfeat_test.mjs dsp_bench.mjs | xargs -P4 -I{} bash -c 'run {}'
for t in pw_smoke.mjs integration_test.mjs abilities_browser_test.mjs look_bench_real.mjs render_bench.mjs look_rare_cost.mjs zoom_smooth.mjs muffle_live_test.mjs; do run $t; done
echo GATES_DONE
