/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import java.util.Iterator;
import java.util.List;

/**
 * The structure of fertility data that is returned by the FertilityFacadeREST
 * web service.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
public class FertilityData {

    private String grossFindingsMale;
    private String grossFindingsFemale;

    public class Screen {

        private Integer born;
        private Integer matings;
        private Integer litters;
        private Integer dissectionEmbryos;

        public Screen() {
        }

        public Integer getBorn() {
            return born;
        }

        public void setBorn(Integer born) {
            this.born = born;
        }

        public Integer getMatings() {
            return matings;
        }

        public void setMatings(Integer matings) {
            this.matings = matings;
        }

        public Integer getLitters() {
            return litters;
        }

        public void setLitters(Integer litters) {
            this.litters = litters;
        }

        public Integer getDissectionEmbryos() {
            return dissectionEmbryos;
        }

        public void setDissectionEmbryos(Integer dissectionEmbryos) {
            this.dissectionEmbryos = dissectionEmbryos;
        }
    };
    private Screen primary;
    private Screen male;
    private Screen female;

    public FertilityData(List<KeyValueRecord> recs) {
        primary = new Screen();
        male = new Screen();
        female = new Screen();
        Iterator<KeyValueRecord> i = recs.iterator();
        while (i.hasNext()) {
            KeyValueRecord kvr = i.next();

            /**
             * NOTE: This requires that every time IMPReSS is updated, these
             * values should be set correctly.
             *
             * This is not pretty, but this is the only way we can group and
             * organise the measurements together.
             */
            switch (kvr.getKey()) {
                case 2365: /* IMPC_FER_001_001: gross findings male */
                    grossFindingsMale = kvr.getValue();
                    break;
                case 2680: /* IMPC_FER_019_001: gross findings female */
                    grossFindingsFemale = kvr.getValue();
                    break;
                case 2366: /* IMPC_FER_002_001: pups born (primary) */
                    primary.born = Integer.parseInt(kvr.getValue());
                    break;
                case 2367: /* IMPC_FER_003_001: total matings (primary) */
                    primary.matings = Integer.parseInt(kvr.getValue());
                    break;
                case 2368: /* IMPC_FER_004_001: total litters (primary) */
                    primary.litters = Integer.parseInt(kvr.getValue());
                    break;
                case 2369: /* IMPC_FER_005_001: total pups with dissection (primary) */
                    primary.dissectionEmbryos = Integer.parseInt(kvr.getValue());
                    break;
                case 2370: /* IMPC_FER_006_001: pups born (male screen) */
                    male.born = Integer.parseInt(kvr.getValue());
                    break;
                case 2371: /* IMPC_FER_007_001: total matings (male screen) */
                    male.matings = Integer.parseInt(kvr.getValue());
                    break;
                case 2372: /* IMPC_FER_008_001: total litters (male screen) */
                    male.litters = Integer.parseInt(kvr.getValue());
                    break;
                case 2373: /* IMPC_FER_009_001: total pups/embryos (male screen) */
                    male.dissectionEmbryos = Integer.parseInt(kvr.getValue());
                    break;
                case 2374: /* IMPC_FER_010_001: pups born (female screen) */
                    female.born = Integer.parseInt(kvr.getValue());
                    break;
                case 2375: /* IMPC_FER_011_001: total matings (female screen) */
                    female.matings = Integer.parseInt(kvr.getValue());
                    break;
                case 2376: /* IMPC_FER_012_001: total litters (female screen) */
                    female.litters = Integer.parseInt(kvr.getValue());
                    break;
                case 2377: /* IMPC_FER_013_001: total pups/embryos (female screen) */
                    female.dissectionEmbryos = Integer.parseInt(kvr.getValue());
                    break;
            }
        }
    }

    public String getGrossFindingsMale() {
        return grossFindingsMale;
    }

    public void setGrossFindingsMale(String grossFindingsMale) {
        this.grossFindingsMale = grossFindingsMale;
    }

    public String getGrossFindingsFemale() {
        return grossFindingsFemale;
    }

    public void setGrossFindingsFemale(String grossFindingsFemale) {
        this.grossFindingsFemale = grossFindingsFemale;
    }

    public Screen getPrimary() {
        return primary;
    }

    public void setPrimary(Screen primary) {
        this.primary = primary;
    }

    public Screen getMale() {
        return male;
    }

    public void setMale(Screen male) {
        this.male = male;
    }

    public Screen getFemale() {
        return female;
    }

    public void setFemale(Screen female) {
        this.female = female;
    }
}
