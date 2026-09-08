import {describe,expect,it} from 'vitest';
import {STUDIO_STUDIES} from '../lab/framework/studio-fixtures.mjs';
import {evaluateSpec} from './evaluate.js';
import {flatten} from './solve.js';
import {PRESS_THEMES} from './theme.js';
import {createLessonController,sampleLesson} from './lesson.js';

describe('canonical studio lessons',()=>{
  for(const study of STUDIO_STUDIES){
    for(const [skin,theme] of Object.entries(PRESS_THEMES)){
      it(`${study.spec.id} resolves every cue in the ${skin} geometry without modifying the document`,()=>{
        const before=JSON.stringify(study);
        const result=evaluateSpec(study.spec,{theme});
        expect(result.ok,JSON.stringify(result.errors)).toBe(true);
        const nodes=flatten(result.plate.root);
        const controller=createLessonController(study.lesson,{instanceId:'integration-test'});
        const events=[];
        controller.subscribe(event=>events.push(event));
        for(const cue of controller.lesson.steps){
          for(const targetId of cue.targetIds){
            const targets=nodes.filter(node=>node.semanticId===targetId);
            expect(targets,`${cue.id}: ${targetId}`).toHaveLength(1);
            expect(targets[0].rect.w).toBeGreaterThan(0);
            expect(targets[0].rect.h).toBeGreaterThan(0);
          }
          expect(controller.select(cue.id,'keyboard').ok).toBe(true);
        }
        expect(events).toHaveLength(controller.lesson.steps.length-1);
        expect(()=>sampleLesson(controller.lesson,Infinity)).toThrow();
        expect(JSON.stringify(study)).toBe(before);
        controller.dispose();
      });
    }
  }
});
